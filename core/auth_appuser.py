# core/auth_appuser.py
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from django.utils.functional import SimpleLazyObject
from .jwt_utils import verify_appuser_jwt
from .models import AppUser

def get_app_user_from_token(request):
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    payload = verify_appuser_jwt(token)
    if not payload:
        return None
    au_id = payload.get("app_user_id")
    if not au_id:
        return None
    try:
        return AppUser.objects.get(id=au_id, is_active=True)
    except AppUser.DoesNotExist:
        return None

class AppUserJWTAuthentication(BaseAuthentication):
    """
    DRF authentication that recognizes Authorization: Bearer <jwt>
    issued to AppUsers (NOT Django auth users). On success, we attach:
      - request.app_user  -> AppUser instance
      - return (None, None) so DRF doesn't treat it as Django User auth
    """
    def authenticate(self, request):
        app_user = get_app_user_from_token(request)
        if app_user:
            # attach lazily so views can use request.app_user
            request.app_user = app_user
            return (None, None)  # This tells DRF "we don't authenticate request.user"
        return None
