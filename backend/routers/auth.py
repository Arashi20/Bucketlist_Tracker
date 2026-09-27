from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from auth import (
    verify_credentials,
    create_access_token,
    lockout_remaining,
    record_login_failure,
    clear_login_failures,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    # Refuse to even check the password while locked out, so the throttle
    # cannot be worn down by continued guessing.
    locked_for = lockout_remaining()
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(locked_for)},
        )
    if not verify_credentials(body.username, body.password):
        record_login_failure()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    clear_login_failures()
    return TokenResponse(access_token=create_access_token(body.username))
