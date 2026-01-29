"""Shared utilities for API."""


def get_client_ip(request):
    """Get client IP from request. Supports X-Forwarded-For (e.g. behind Render proxy)."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # Format: "client, proxy1, proxy2" — first is client
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR') or ''
