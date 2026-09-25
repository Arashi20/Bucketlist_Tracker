import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from dotenv import load_dotenv

load_dotenv()


def _required_env(name: str) -> str:
    # No insecure fallbacks: a missing secret must stop the app, not leave it
    # running with a publicly known key or password.
    value = os.getenv(name, "")
    if not value:
        raise RuntimeError(f"{name} must be set")
    return value


SECRET_KEY = _required_env("SECRET_KEY")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

APP_USERNAME = os.getenv("APP_USERNAME", "ash")
APP_PASSWORD = _required_env("APP_PASSWORD")

bearer = HTTPBearer()

# Failed logins are throttled globally rather than per IP: behind Railway's
# proxy the client address comes from a header a caller can set at will.
MAX_FAILED_LOGINS = 5
FAILURE_WINDOW_SECONDS = 900
LOCKOUT_SECONDS = 900
_failed_logins: list[float] = []


def lockout_remaining() -> int:
    """Seconds until login is allowed again, or 0 when it is allowed now."""
    global _failed_logins
    now = time.time()
    _failed_logins = [t for t in _failed_logins if now - t < FAILURE_WINDOW_SECONDS]
    if len(_failed_logins) < MAX_FAILED_LOGINS:
        return 0
    return max(int(LOCKOUT_SECONDS - (now - _failed_logins[-1])), 0)


def record_login_failure() -> None:
    _failed_logins.append(time.time())


def clear_login_failures() -> None:
    _failed_logins.clear()


def verify_credentials(username: str, password: str) -> bool:
    ok_user = secrets.compare_digest(username.encode(), APP_USERNAME.encode())
    ok_pass = secrets.compare_digest(password.encode(), APP_PASSWORD.encode())
    return ok_user and ok_pass


def create_access_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": username, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> str:
    try:
        payload  = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        username = payload.get("sub")
        # Renaming APP_USERNAME revokes tokens issued under the old name.
        if not username or not secrets.compare_digest(username.encode(), APP_USERNAME.encode()):
            raise ValueError
        return username
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
