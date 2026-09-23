"""Environment configuration for the read-only connector service."""

import os
from datetime import datetime
from urllib.parse import urlparse

import pytz

TIMEZONE_NAME = os.getenv('APP_TIMEZONE', 'Europe/Amsterdam')
LOCAL_TZ = pytz.timezone(TIMEZONE_NAME)


def today_local():
    """Today's date where the user lives, which decides "upcoming" vs "past"."""
    return datetime.now(LOCAL_TZ).date()


def flag(name, default='1'):
    return os.getenv(name, default).lower() in ('1', 'true', 'yes', 'on')


def csv_env(name, default=''):
    return [item.strip() for item in os.getenv(name, default).split(',') if item.strip()]


def database_url():
    """The main app's database, normalized onto the psycopg 3 driver.

    The main app talks asyncpg; this service is synchronous, so any driver
    suffix Railway or the main app put on the URL is swapped for psycopg.
    """
    url = os.getenv('DATABASE_URL', 'sqlite:///bucketlist.db')
    for prefix in ('postgres://', 'postgresql://', 'postgresql+asyncpg://',
                   'postgresql+psycopg2://'):
        if url.startswith(prefix):
            return url.replace(prefix, 'postgresql+psycopg://', 1)
    return url


def secret_key():
    """Key used to sign OAuth tokens issued by this service.

    Independent of the main app's key - the approval page checks the app's
    username and password directly, not a signed cookie. Rotating this revokes
    every token this connector has handed out.
    """
    key = os.getenv('MCP_SECRET_KEY')
    if not key:
        raise RuntimeError(
            'MCP_SECRET_KEY must be set. Without it, OAuth tokens for this '
            'connector could be forged.'
        )
    return key


def app_username():
    """The username you sign into the Bucketlist app with."""
    return os.getenv('APP_USERNAME', '')


def app_password():
    """The password you sign into the Bucketlist app with.

    The main app has no users table - its single login lives in these two
    environment variables - so the connector reads the same two variables
    (on Railway, as references to the main service's variables).
    """
    return os.getenv('APP_PASSWORD', '')


def api_tokens():
    """Static bearer tokens, for curl and for Claude Code's --header flag."""
    return csv_env('API_READ_TOKEN')


def public_base_url(request):
    """External https base URL of this service, without a trailing slash.

    Railway terminates TLS in front of the app, so the request itself looks
    like plain http; prefer the configured or injected public domain.
    """
    configured = os.getenv('MCP_PUBLIC_URL')
    if configured:
        return configured.rstrip('/')
    domain = os.getenv('RAILWAY_PUBLIC_DOMAIN')
    if domain:
        return f'https://{domain}'
    return request.url_root.rstrip('/')


def railway_domain():
    """The domain Railway injects for this service, if it is running there."""
    return os.getenv('RAILWAY_PUBLIC_DOMAIN', '').strip()


def allowed_hosts():
    """Host header allow-list; empty means accept anything.

    Set MCP_ALLOWED_HOSTS to this service's domain so a DNS rebinding attempt
    from someone else's hostname is rejected before it reaches a tool. The
    domain Railway injects always counts as this service, so a typo in
    MCP_ALLOWED_HOSTS cannot lock the connector out of its own URL.
    """
    hosts = csv_env('MCP_ALLOWED_HOSTS')
    if not hosts:
        return [railway_domain()] if railway_domain() else []
    if railway_domain() and railway_domain() not in hosts:
        hosts.append(railway_domain())
    return hosts


def public_url_warning():
    """Describe a MCP_PUBLIC_URL that disagrees with the domain Railway gave us.

    Every OAuth endpoint Claude is told to call is built from this URL, so
    pointing it at the wrong host makes registration fail against a domain
    that may not even exist - with nothing reaching this service to log.
    """
    configured = os.getenv('MCP_PUBLIC_URL', '').strip()
    domain = railway_domain()
    if not configured or not domain:
        return None
    host = urlparse(configured).hostname or ''
    if host == domain:
        return None
    return (f'MCP_PUBLIC_URL points at "{host}" but this service is served at '
            f'"{domain}". Claude will be told to call OAuth endpoints on '
            f'{host}, which is probably not this service. Set MCP_PUBLIC_URL '
            f'to https://{domain}, or remove it to use that automatically.')


def mcp_enabled():
    return flag('MCP_ENABLED')


def oauth_enabled():
    return flag('MCP_OAUTH_ENABLED')


def dynamic_registration_enabled():
    return flag('MCP_OAUTH_ALLOW_DYNAMIC_REGISTRATION')
