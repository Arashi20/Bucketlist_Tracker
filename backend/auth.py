import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 24

APP_USERNAME = os.getenv("APP_USERNAME", "ash")
APP_PASSWORD = os.getenv("APP_PASSWORD", "changeme")

bearer = HTTPBearer()


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
        payload  = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise ValueError
        return username
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
