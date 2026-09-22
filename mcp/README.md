# Bucketlist Connector (MCP)

A **standalone, read-only** service that exposes the Bucketlist app -
the **bucketlist**, the **scratch map** and the **trip planner** - to Claude as
a custom connector, and to scripts as a plain REST API.

It deploys as its own Railway service pointing at this folder, next to the main
app, and reads the same Postgres database.

```
Postgres ──┬── Bucketlist_Tracker     (the app, read + write)
           └── Bucketlist Connector   (this folder, read only)
                     ▲
                     │ MCP over HTTPS + OAuth
                  Claude
```

## Why it is read-only

This is enforced by how the service is built:

* no route accepts a write method (the REST endpoints are GET only, and the
  POSTs are the MCP JSON-RPC and OAuth endpoints);
* every collector in `data.py` issues SELECTs and nothing else;
* the tools are declared with `readOnlyHint`, and there is no tool that writes;
* `models.py` here is a mirror with **no `create_all()`**. The schema belongs
  to the main app, and this service never creates or migrates it.

The main app marks a trip whose date has passed as `completed` when you open
the trip list. The connector does not write that change back. It reports such a
trip as `completed` when it reads it, so Claude sees the same status as the app.

## Deploying on Railway

1. In the same Railway project: **New → GitHub Repo →** this repository.
2. **Settings → Source → Root Directory:** `/mcp`. This makes it its own
   service rather than a second copy of the app.
3. **Settings → Config-as-code → Railway config file:** `/mcp/railway.toml`.
   **Don't skip this.** Railway doesn't look for the config file inside the
   Root Directory, so without it the service would pick up the repo-root
   `railway.toml` (the frontend npm build and the uvicorn start command) and
   fail to deploy.
4. **Settings → Networking:** generate a domain.
5. **Variables:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Railway reference to the same database) |
| `MCP_SECRET_KEY` | Any long random string. It signs the tokens this connector issues, and rotating it revokes them all. It doesn't have to match the main app's `SECRET_KEY`. |
| `APP_USERNAME` | `${{Bucketlist_Tracker.APP_USERNAME}}`: a reference to the main service's variable (use your main service's name) |
| `APP_PASSWORD` | `${{Bucketlist_Tracker.APP_PASSWORD}}`: same idea |

The app has no users table. Its single login is stored in `APP_USERNAME` /
`APP_PASSWORD`, so the approval page checks those same two variables.
Referencing them keeps the connector in sync when you change your password.
If either variable is empty, the approval page won't let anyone sign in.

Optional:

| Variable | Default | What it does |
|---|---|---|
| `APP_TIMEZONE` | `Europe/Amsterdam` | Sets the "today" used to decide whether a trip is upcoming or past |
| `MCP_PUBLIC_URL` / `MCP_ALLOWED_HOSTS` | the Railway domain | Set these only for a custom domain |
| `API_READ_TOKEN` | - | Static bearer token(s) for curl and Claude Code. Comma-separate to rotate. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `MCP_OAUTH_CLIENT_ID` / `MCP_OAUTH_CLIENT_SECRET` | - | A pre-shared OAuth client, if you'd rather paste credentials into Claude than let it register itself |
| `MCP_OAUTH_REDIRECT_URIS` | Claude's callbacks | Comma-separated callbacks allowed for that pre-shared client |
| `MCP_ENABLED` | `1` | `0` turns the `/mcp` endpoint off |
| `MCP_OAUTH_ENABLED` | `1` | `0` turns the OAuth endpoints off |
| `MCP_OAUTH_ALLOW_DYNAMIC_REGISTRATION` | `1` | `0` requires the pre-shared client |

## Connecting Claude

1. Claude → **Settings → Connectors → Add custom connector**.
2. URL: `https://your-connector.up.railway.app/mcp`
3. Leave the OAuth client ID and secret blank so Claude registers itself.
4. Click **Connect**. A login page appears: sign in with your app username and
   password, then click **Approve**. Claude now holds a read-only token.

For Claude Code, the static token is simpler:

```bash
claude mcp add --transport http bucketlist https://your-connector.up.railway.app/mcp \
  --header "Authorization: Bearer $API_READ_TOKEN"
```

## Tools

| Tool | Returns |
|---|---|
| `get_travel_overview` | One-call summary: bucketlist progress, countries visited and the latest visit, trip counts, and the next three trips. It also cross-checks the pages: wishlist countries you've already visited, ones not visited yet, and "done" countries missing from the scratch map. |
| `get_bucketlist` | Every item with type, status, description and date added, plus progress overall and per type. Can filter by `status`, `type` and `search`. |
| `get_visited_countries` | Scratch map countries with ISO code, visit date and notes, the total, the share of the world, and new countries per year. Can filter by `search` or `year`. |
| `get_trips` | Trips with date, days until departure, status, ticket and accommodation prices and total cost, the next trip, counts per status, and budget totals. Can filter with `when` (`upcoming` / `past`), `status` or `search`. |

The cross-checks match countries by name, ignoring case, because the app
doesn't link bucketlist items to scratch map entries. Prices are reported as
entered; the app doesn't store a currency.

## REST

```bash
curl -H "Authorization: Bearer $API_READ_TOKEN" https://your-connector.up.railway.app/api/v1/ping
curl -H "Authorization: Bearer $API_READ_TOKEN" https://your-connector.up.railway.app/api/v1/overview
curl -H "Authorization: Bearer $API_READ_TOKEN" "https://your-connector.up.railway.app/api/v1/bucketlist?status=wishlist&type=country"
curl -H "Authorization: Bearer $API_READ_TOKEN" "https://your-connector.up.railway.app/api/v1/countries?year=2025"
curl -H "Authorization: Bearer $API_READ_TOKEN" "https://your-connector.up.railway.app/api/v1/trips?when=upcoming"
```

Unauthenticated helpers: `GET /` describes the service. `GET /healthz` reports
the database connection and the settings the OAuth handshake depends on,
including `app_login_configured`. Check it first when Claude can't connect.
If `public_url_matches_request` is `false`, that's the usual cause of
"Couldn't register with the sign-in service", and the `warning` field says
what to change.

## Files

| File | What it holds |
|---|---|
| `server.py` | App factory, Host allow-list, `/`, `/healthz`, `/whoami`. Gunicorn entrypoint. |
| `config.py` | Every environment variable, in one place |
| `models.py` | Read-only mirror of the three tables (`bucketitem`, `visitedcountry`, `tripplan`) |
| `data.py` | The `collect_*` read queries behind every tool and endpoint |
| `auth.py` | Bearer token resolution and the app-login check |
| `mcp_endpoint.py` | `POST /mcp`: JSON-RPC, tool definitions, dispatch |
| `oauth.py` | OAuth 2.1: discovery, registration, authorize, token |
| `rest_api.py` | `GET /api/v1/...` |
| `railway.toml` | Build and start config for this service (see step 3 above) |
| `check_schema.py` | Dev check that the mirror still matches `backend/models.py` |

## Security notes

- The approval page shows the name of the client that registered and the
  address the access will be sent to. It warns you when that address isn't
  `claude.ai` / `claude.com`.
- Failed sign-ins are throttled. After five failures within 15 minutes, the
  form locks for 15 minutes.
- Access tokens last an hour and refresh tokens 30 days. Rotating
  `MCP_SECRET_KEY` revokes all of them at once. Changing `APP_USERNAME` also
  revokes them.
- Set `MCP_OAUTH_ALLOW_DYNAMIC_REGISTRATION=0` once Claude is connected to
  stop accepting new client registrations.

## Local development

```bash
cd mcp
pip install -r requirements.txt
cp .env.example .env      # point DATABASE_URL at the main app's database
python server.py          # http://localhost:8000
```

If you rename a column in `backend/models.py`, mirror it here and confirm with:

```bash
python mcp/check_schema.py    # from the repo root, with backend requirements installed
```
