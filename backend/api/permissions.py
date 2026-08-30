"""Custom DRF permissions."""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from .device_lock import DEVICE_RESTRICTED_MESSAGE, assert_student_device_allowed


class IsAuthenticatedDeviceAllowed(permissions.IsAuthenticated):
    """
    IsAuthenticated + for students: one registered device unless allow_multi_device.
    Same phone on Wi‑Fi or mobile data is allowed; another browser/device is not.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ('admin', 'content_admin'):
            return True
        if user.role != 'student':
            return True
        if not user.is_within_account_period():
            raise PermissionDenied(
                detail='Account access is not valid for the current period. Please contact administrator.'
            )
        if getattr(user, 'allow_multi_device', False):
            return True
        assert_student_device_allowed(user, request)
        return True
