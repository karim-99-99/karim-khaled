"""Telegram Login verification (OIDC id_token + legacy widget hash)."""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import jwt
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

TELEGRAM_ISSUER = "https://oauth.telegram.org"
TELEGRAM_JWKS_URI = "https://oauth.telegram.org/.well-known/jwks.json"

_jwks_client: Optional[PyJWKClient] = None


def telegram_client_id() -> str:
    return (os.environ.get("TELEGRAM_CLIENT_ID") or "").strip()


def telegram_bot_token() -> str:
    return (os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()


def telegram_enabled() -> bool:
    return bool(telegram_client_id() or telegram_bot_token())


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(TELEGRAM_JWKS_URI, cache_keys=True)
    return _jwks_client


def verify_telegram_id_token(id_token: str) -> Dict[str, Any]:
    """
    Verify Telegram OIDC id_token (RS256/ES256) and return claims.
    Requires TELEGRAM_CLIENT_ID (audience).
    """
    client_id = telegram_client_id()
    if not client_id:
        raise ValueError("TELEGRAM_CLIENT_ID is not configured")
    if not id_token or not isinstance(id_token, str):
        raise ValueError("id_token is required")

    signing_key = _get_jwks_client().get_signing_key_from_jwt(id_token)
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256", "ES256"],
        audience=str(client_id),
        issuer=TELEGRAM_ISSUER,
        options={"require": ["exp", "iat", "iss", "aud", "sub"]},
    )
    return claims


def verify_telegram_widget_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Verify classic Login Widget payload (HMAC-SHA256 of bot token).
    Does not include phone number.
    """
    bot_token = telegram_bot_token()
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")

    received_hash = str(data.get("hash") or "").strip()
    if not received_hash:
        raise ValueError("hash is required")

    check_fields = {
        k: v
        for k, v in data.items()
        if k != "hash" and v is not None and v != ""
    }
    data_check_string = "\n".join(
        f"{k}={check_fields[k]}" for k in sorted(check_fields.keys())
    )
    secret_key = hashlib.sha256(bot_token.encode("utf-8")).digest()
    calculated = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        raise ValueError("Invalid Telegram login hash")

    auth_date = int(check_fields.get("auth_date") or 0)
    if auth_date <= 0 or abs(time.time() - auth_date) > 86400:
        raise ValueError("Telegram auth_date is expired or invalid")

    return check_fields


def claims_to_profile(claims: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize OIDC claims or widget fields into a common profile dict."""
    # OIDC uses `id` (telegram user id) and `sub`; widget uses `id`
    tid = claims.get("id") or claims.get("sub")
    if tid is None:
        raise ValueError("Telegram user id missing")
    tid = str(tid).strip()
    if not tid:
        raise ValueError("Telegram user id missing")

    name = (claims.get("name") or "").strip()
    given = (claims.get("given_name") or claims.get("first_name") or "").strip()
    family = (claims.get("family_name") or claims.get("last_name") or "").strip()
    if not given and name:
        parts = name.split(None, 1)
        given = parts[0]
        family = parts[1] if len(parts) > 1 else family

    username = (
        claims.get("preferred_username")
        or claims.get("username")
        or ""
    )
    username = str(username).strip().lstrip("@")

    phone = (
        claims.get("phone_number")
        or claims.get("phone")
        or ""
    )
    phone = str(phone).strip()

    return {
        "telegram_id": tid,
        "telegram_username": username or None,
        "first_name": given or username or f"tg_{tid}",
        "last_name": family or "",
        "phone": phone or None,
        "photo_url": claims.get("picture") or claims.get("photo_url") or None,
    }


def parse_telegram_auth_body(body: Dict[str, Any]) -> Tuple[Dict[str, Any], str]:
    """
    Returns (profile, source) where source is 'oidc' or 'widget'.
    """
    id_token = (body.get("id_token") or "").strip()
    if id_token:
        claims = verify_telegram_id_token(id_token)
        return claims_to_profile(claims), "oidc"

    # Classic widget fields
    if body.get("id") and body.get("hash"):
        verified = verify_telegram_widget_payload(body)
        return claims_to_profile(verified), "widget"

    # Frontend may nest under "user"
    user_obj = body.get("user")
    if isinstance(user_obj, dict) and user_obj.get("id") and body.get("hash"):
        payload = {**user_obj, "hash": body.get("hash")}
        verified = verify_telegram_widget_payload(payload)
        return claims_to_profile(verified), "widget"

    raise ValueError("Provide id_token (OIDC) or classic Telegram widget fields")
