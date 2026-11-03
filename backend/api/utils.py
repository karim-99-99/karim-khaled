"""Shared utilities for API."""

import re

BUNNY_VIDEO_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.I,
)
BUNNY_VIDEO_NUMERIC_RE = re.compile(r'^\d{6,}$')


def normalize_email(value):
    """Lowercase trimmed email; empty string if missing."""
    if value is None:
        return ''
    return str(value).strip().lower()


def normalize_phone(value):
    """
    Normalize phone for uniqueness checks / storage.
    Saudi mobiles like +9665xxxxxxxx / 9665xxxxxxxx → 05xxxxxxxx.
    Returns '' when empty/invalid-empty.
    """
    if value is None:
        return ''
    raw = str(value).strip()
    if not raw:
        return ''
    digits = re.sub(r'\D', '', raw)
    if not digits:
        return ''
    if digits.startswith('00966') and len(digits) > 5:
        digits = digits[5:]
        if not digits.startswith('0'):
            digits = '0' + digits
    elif digits.startswith('966') and len(digits) >= 12:
        digits = '0' + digits[3:]
    return digits


def email_taken(email, exclude_user_id=None):
    """True if another user already has this email (case-insensitive, non-empty)."""
    from api.models import User

    email = normalize_email(email)
    if not email:
        return False
    qs = User.objects.filter(email__iexact=email)
    if exclude_user_id is not None:
        qs = qs.exclude(pk=exclude_user_id)
    return qs.exists()


def phone_taken(phone, exclude_user_id=None):
    """
    True if another user already has this phone (normalized digit forms).
    Matches common variants: 05…, 9665…, +9665…
    """
    from api.models import User

    phone = normalize_phone(phone)
    if not phone:
        return False
    qs = User.objects.exclude(phone__isnull=True).exclude(phone='')
    if exclude_user_id is not None:
        qs = qs.exclude(pk=exclude_user_id)
    for existing in qs.only('id', 'phone').iterator():
        if normalize_phone(existing.phone) == phone:
            return True
    return False


def normalize_client_ip(ip):
    """Strip IPv4-mapped IPv6 and optional :port so device-lock compares stay stable."""
    if not ip:
        return ''
    ip = str(ip).strip()
    if ip.lower().startswith('::ffff:'):
        ip = ip[7:]
    if ip.count(':') == 1 and '.' in ip:
        ip = ip.split(':', 1)[0]
    return ip.strip()


def get_client_ip(request):
    """Get client IP from request. Supports X-Forwarded-For (e.g. behind Render proxy)."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # Format: "client, proxy1, proxy2" — first is client
        return normalize_client_ip(xff.split(',')[0])
    return normalize_client_ip(request.META.get('REMOTE_ADDR') or '')


def ips_match(current, registered):
    """True when both IPs are present and equal after normalize_client_ip."""
    a = normalize_client_ip(current)
    b = normalize_client_ip(registered)
    return bool(a) and bool(b) and a == b


def is_bunny_video_id(value):
    """True when value is a raw Bunny video ID (UUID or numeric)."""
    if not value or not isinstance(value, str):
        return False
    v = value.strip()
    return bool(BUNNY_VIDEO_UUID_RE.match(v) or BUNNY_VIDEO_NUMERIC_RE.match(v))


def looks_like_bunny_url(value):
    """
    Best-effort detection for Bunny-hosted URL formats we expect in legacy rows.
    """
    if not value or not isinstance(value, str):
        return False
    v = value.strip().lower()
    return (
        'iframe.mediadelivery.net' in v
        or 'video.bunnycdn.com' in v
        or '.b-cdn.net' in v
    )


def extract_bunny_video_id(value):
    """
    Accept a raw Bunny video ID or known Bunny URL formats and return the video ID.
    """
    if not value or not isinstance(value, str):
        return None

    v = value.strip()
    if is_bunny_video_id(v):
        return v

    # https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID?...
    m = re.search(r'iframe\.mediadelivery\.net\/embed\/[^/]+\/([^/?#]+)', v, re.I)
    if m:
        candidate = (m.group(1) or '').strip()
        if is_bunny_video_id(candidate):
            return candidate

    # https://video.bunnycdn.com/play/VIDEO_ID?...
    m = re.search(r'video\.bunnycdn\.com\/play\/([^/?#]+)', v, re.I)
    if m:
        candidate = (m.group(1) or '').strip()
        if is_bunny_video_id(candidate):
            return candidate

    # https://vz-*.b-cdn.net/VIDEO_ID/playlist.m3u8
    if '.b-cdn.net' in v.lower():
        m = re.search(
            r'(?:^|\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d{6,})(?:[/?#]|$)',
            v,
            re.I,
        )
        if m:
            candidate = (m.group(1) or '').strip()
            if is_bunny_video_id(candidate):
                return candidate

    return None


def extract_bunny_library_id(value):
    """
    Extract Bunny library id from known embed URL format:
    https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID?...
    """
    if not value or not isinstance(value, str):
        return None
    v = value.strip()
    m = re.search(r'iframe\.mediadelivery\.net\/embed\/([^/]+)\/[^/?#]+', v, re.I)
    if not m:
        return None
    lib = (m.group(1) or '').strip()
    return lib or None
