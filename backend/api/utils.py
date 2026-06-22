"""Shared utilities for API."""

import re

BUNNY_VIDEO_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.I,
)
BUNNY_VIDEO_NUMERIC_RE = re.compile(r'^\d{6,}$')


def get_client_ip(request):
    """Get client IP from request. Supports X-Forwarded-For (e.g. behind Render proxy)."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # Format: "client, proxy1, proxy2" — first is client
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or ''


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
