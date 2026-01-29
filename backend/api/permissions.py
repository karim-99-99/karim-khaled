"""Custom DRF permissions."""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from .utils import get_client_ip

DEVICE_RESTRICTED_MESSAGE = (
    'Access allowed only from your registered device. '
    'Contact administrator for multi-device access.'
)


class IsAuthenticatedDeviceAllowed(permissions.IsAuthenticated):
    """
    IsAuthenticated + for students: allow only from registered IP unless allow_multi_device.
    Admins always allowed. Students with allow_multi_device can access from any IP.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role == 'admin':
            return True
        if user.role != 'student':
            return True
        if getattr(user, 'allow_multi_device', False):
            return True
        reg = getattr(user, 'registered_ip', None) or ''
        if not reg.strip():
            return True
        ip = get_client_ip(request) or ''
        if ip.strip() and reg.strip() and ip.strip() == reg.strip():
            return True
        raise PermissionDenied(detail=DEVICE_RESTRICTED_MESSAGE)
