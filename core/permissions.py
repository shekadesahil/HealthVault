# core/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS

class StaffWriteOnly(BasePermission):
    """Read for any authenticated user; write only for staff."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)

class IsTargetUserOrStaff(BasePermission):
    """Object-level: allow if staff, or if request.user is the target user."""
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        app_user_id = getattr(getattr(request.user, "appuser", None), "id", None)
        return obj.target_user_id and obj.target_user_id == app_user_id
