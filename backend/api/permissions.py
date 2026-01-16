from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users to access certain views.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsActiveAccount(permissions.BasePermission):
    """
    Custom permission to check if user account is active.
    Students with inactive accounts cannot access resources.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admins always have access
        if request.user.role == 'admin':
            return True
        
        # Students need active account
        return request.user.is_active_account
