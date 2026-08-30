"""One-device lock by browser device id (not IP — Wi‑Fi / mobile data on same phone is OK)."""

from rest_framework import status
from rest_framework.response import Response

DEVICE_RESTRICTED_MESSAGE = (
    'This account is registered on one device only. '
    'Contact the administrator to allow multi-device access.'
)

DEVICE_ID_MAX_LEN = 64


def get_request_device_id(request) -> str:
    raw = request.META.get('HTTP_X_DEVICE_ID') or request.headers.get('X-Device-Id') or ''
    return str(raw).strip()[:DEVICE_ID_MAX_LEN]


def bind_student_device(user, device_id: str) -> None:
    device_id = (device_id or '').strip()[:DEVICE_ID_MAX_LEN]
    if not device_id or user.role != 'student':
        return
    if not (getattr(user, 'registered_device_id', None) or '').strip():
        user.registered_device_id = device_id
        user.save(update_fields=['registered_device_id'])


def student_device_denied_response(user, request):
    """
    Return a 403 Response when a locked student uses another device, else None.
    Binds the first device id when none is stored yet.
    """
    if user.role != 'student' or getattr(user, 'allow_multi_device', False):
        return None

    device_id = get_request_device_id(request)
    if not device_id:
        return Response(
            {
                'error': DEVICE_RESTRICTED_MESSAGE,
                'code': 'device_restricted',
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    registered = (getattr(user, 'registered_device_id', None) or '').strip()
    if not registered:
        bind_student_device(user, device_id)
        return None

    if registered == device_id:
        return None

    return Response(
        {
            'error': DEVICE_RESTRICTED_MESSAGE,
            'code': 'device_restricted',
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def assert_student_device_allowed(user, request) -> None:
    """Raise PermissionDenied when device lock blocks this request."""
    from rest_framework.exceptions import PermissionDenied

    denied = student_device_denied_response(user, request)
    if denied is not None:
        detail = denied.data.get('error') or DEVICE_RESTRICTED_MESSAGE
        raise PermissionDenied(detail=detail)
