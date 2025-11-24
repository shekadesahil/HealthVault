from pathlib import Path
import random
import hashlib, uuid
from .jwt_utils import create_appuser_jwt
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.decorators import action
from datetime import  time, timedelta, datetime
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.contrib.auth.hashers import make_password, check_password  
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from django.db import transaction
from django.db import IntegrityError
from django.conf import settings    
from rest_framework.exceptions import ValidationError
from .permissions import StaffWriteOnly, IsTargetUserOrStaff
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated
from .models import Department, Doctor, Booking, Admission, AdmissionTask, Report, Complaint, Notification, MenuItem, CanteenOrder, CanteenOrderItem, PatientRecord, PatientAccess, OtpCode, MedicalOrder, AppUser, Bed, Ward
from django.utils import timezone
from .serializers import DepartmentSerializer, DoctorSerializer, BookingSerializer, AdmissionSerializer, AdmissionTaskSerializer, ReportSerializer, ComplaintSerializer, NotificationSerializer, MenuItemSerializer, CanteenOrderSerializer,  CanteenOrderItemSerializer , PatientRecordSerializer, PatientAccessSerializer, OtpSendSerializer, OtpVerifySerializer, SignupSerializer, LoginSerializer, MedicalOrderSerializer, AppUserSerializer, ReportUploadSerializer, WardSerializer, BedSerializer
from .permissions import StaffWriteOnly, IsTargetUserOrStaff

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    @action(detail=True, methods=['get'])
    def doctors(self, request, pk=None):
        qs = Doctor.objects.filter(department_id=pk).order_by('full_name')
        data = DoctorSerializer(qs, many=True).data
        return Response(data)


class DoctorViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorSerializer

    def get_queryset(self):
        qs = Doctor.objects.select_related('department').order_by('full_name')
        dept_id = self.request.query_params.get('department')
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        return qs

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        qs = Booking.objects.select_related('patient', 'department', 'doctor').order_by('-created_at')

        # optional filters for convenience
        patient_id = self.request.query_params.get('patient')
        dept_id = self.request.query_params.get('department')
        doctor_id = self.request.query_params.get('doctor')
        status = self.request.query_params.get('status')

        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if status:
            qs = qs.filter(status=status)

        return qs

    @action(detail=False, methods=['get'], url_path='my-bookings')
    def my_bookings(self, request):
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response({"detail": "Pass ?patient=<id>."}, status=400)
        qs = self.get_queryset().filter(patient_id=patient_id)
        data = BookingSerializer(qs, many=True).data
        return Response(data)
    
class AdmissionViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionSerializer

    def get_queryset(self):
        qs = Admission.objects.select_related('patient', 'ward', 'bed', 'doctor').order_by('-admit_time')

        # Optional filters
        patient = self.request.query_params.get('patient')
        status  = self.request.query_params.get('status')
        ward    = self.request.query_params.get('ward')
        doctor  = self.request.query_params.get('doctor')
        active_only = self.request.query_params.get('active_only')

        if patient:
            qs = qs.filter(patient_id=patient)
        if status:
            qs = qs.filter(status__iexact=status)
        if ward:
            qs = qs.filter(ward_id=ward)
        if doctor:
            qs = qs.filter(doctor_id=doctor)
        if active_only in ('1', 'true', 'True'):
            qs = qs.filter(discharge_time__isnull=True, status='active')

        return qs

    @action(detail=False, methods=['get'], url_path='my')
    def my_admissions(self, request):
        patient = request.query_params.get('patient')
        if not patient:
            return Response({"detail": "Pass ?patient=<id>."}, status=400)
        qs = self.get_queryset().filter(patient_id=patient)
        return Response(AdmissionSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        qs = AdmissionTask.objects.filter(admission_id=pk).order_by('-created_at')
        return Response(AdmissionTaskSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def reports(self, request, pk=None):
        qs = Report.objects.filter(admission_id=pk).order_by('-uploaded_at')
        return Response(ReportSerializer(qs, many=True).data)


class AdmissionTaskViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionTaskSerializer

    def get_queryset(self):
        qs = AdmissionTask.objects.select_related('admission').order_by('-created_at')
        admission = self.request.query_params.get('admission')
        patient   = self.request.query_params.get('patient')
        status    = self.request.query_params.get('status')

        if admission:
            qs = qs.filter(admission_id=admission)
        if patient:
            qs = qs.filter(admission__patient_id=patient)
        if status:
            qs = qs.filter(status=status)

        return qs


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer

    # Use upload serializer only for the /upload action
    def get_serializer_class(self):
        if getattr(self, "action", None) == "upload":
            return ReportUploadSerializer
        return ReportSerializer

    # Map logged-in Django user -> AppUser (by email) — used by the web app
    def _current_app_user(self):
        u = self.request.user
        try:
            return AppUser.objects.get(email__iexact=getattr(u, "email", "") or "")
        except AppUser.DoesNotExist:
            return None

    def get_queryset(self):
        qs = (
            Report.objects
            .select_related("patient", "admission")
            .order_by("-uploaded_at")
        )

        # optional filters
        p = self.request.query_params
        if p.get("patient"):
            qs = qs.filter(patient_id=p["patient"])
        if p.get("admission"):
            qs = qs.filter(admission_id=p["admission"])
        if p.get("type"):
            qs = qs.filter(report_type=p["type"])

        # Access control
        u = self.request.user
        if not u.is_authenticated:
            return Report.objects.none()

        # Staff can see everything (web admin)
        if u.is_staff:
            return qs

        # ✅ Mobile path: prefer request.app_user if middleware set it
        app_user = getattr(self.request, "app_user", None)
        if app_user:
            patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                                               .values_list("patient_id", flat=True)
            return qs.filter(patient_id__in=list(patient_ids))

        # Web app path: fall back to Django-auth → AppUser mapping
        app_user = self._current_app_user()
        if not app_user:
            return Report.objects.none()

        patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                                           .values_list("patient_id", flat=True)
        return qs.filter(patient_id__in=list(patient_ids))

    @action(
        detail=False,
        methods=["post"],
        url_path="upload",
        parser_classes=[MultiPartParser, FormParser],
        permission_classes=[permissions.IsAuthenticated, permissions.IsAdminUser],
    )
    def upload(self, request):
        ser = ReportUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        patient     = ser.validated_data["patient"]
        admission   = ser.validated_data.get("admission")
        report_type = ser.validated_data["report_type"]
        upfile      = ser.validated_data["file"]
        notes       = ser.validated_data.get("notes")

        # ensure folder exists
        dest_dir = Path(settings.REPORTS_DIR)
        dest_dir.mkdir(parents=True, exist_ok=True)

        original_name = upfile.name
        ext = Path(original_name).suffix or ".pdf"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest_path = dest_dir / unique_name

        # write file
        with open(dest_path, "wb") as fh:
            for chunk in upfile.chunks():
                fh.write(chunk)

        # checksum
        sha = hashlib.sha256()
        with open(dest_path, "rb") as fh:
            for chunk in iter(lambda: fh.read(8192), b""):
                sha.update(chunk)
        checksum = sha.hexdigest()

        # uploaded_by is AppUser id when available; keep working for web
        app_user = getattr(self.request, "app_user", None) or self._current_app_user()
        uploaded_by = app_user.id if app_user else 0

        obj = Report.objects.create(
            patient_id=patient.id,
            admission_id=getattr(admission, "id", None),
            report_type=report_type,
            file_name=original_name,
            object_key=unique_name,
            mime_type=getattr(upfile, "content_type", "application/pdf") or "application/pdf",
            size_bytes=getattr(upfile, "size", None),
            checksum_sha256=checksum,
            uploaded_by=uploaded_by,
            uploaded_at=timezone.now(),
            notes=notes,
        )
        return Response(ReportSerializer(obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        obj = self.get_object()
        key = getattr(obj, "object_key", None) or getattr(obj, "file_name", None)
        if not key:
            raise Http404("No file name")

        base = Path(settings.REPORTS_DIR)
        path = _safe_path(base, key)

        if not path.exists():
            raise Http404("File not found")

        return FileResponse(
            open(path, "rb"),
            as_attachment=True,
            filename=Path(key).name,
            content_type=getattr(obj, "mime_type", "application/octet-stream"),
        )



class AppUserViewSet(viewsets.ModelViewSet):
    queryset = AppUser.objects.all().order_by("-id")
    serializer_class = AppUserSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params

        if p.get("email"):
            qs = qs.filter(email__iexact=p["email"])
        if p.get("phone"):
            qs = qs.filter(phone=p["phone"])
        if p.get("username"):
            qs = qs.filter(username__iexact=p["username"])
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(
                Q(email__icontains=q) |
                Q(phone__icontains=q) |
                Q(username__icontains=q)
            )
        return qs
    
class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]

    # ---- helpers ------------------------------------------------------------
    def _current_app_user(self):
        """Map logged-in Django user -> AppUser by email (returns None if not found)."""
        u = self.request.user
        if not u or not u.is_authenticated or not getattr(u, "email", None):
            return None
        try:
            return AppUser.objects.get(email__iexact=u.email)
        except AppUser.DoesNotExist:
            return None

    def _active_admission_for(self, patient_id):
        return (
            Admission.objects
            .filter(patient_id=patient_id, status__iexact="active")
            .order_by("-admit_time")
            .first()
        )

    # ---- queryset -----------------------------------------------------------
    def get_queryset(self):
        qs = Complaint.objects.select_related("patient", "ward", "bed").order_by("-created_at")

        # Filters
        p = self.request.query_params
        if p.get("patient"):
            qs = qs.filter(patient_id=p["patient"])
        if p.get("status"):
            qs = qs.filter(status=p["status"])

        # Scope by role
        u = self.request.user
        if not u.is_authenticated:
            return Complaint.objects.none()

        if u.is_staff:
            return qs

        # ✅ NEW: Support JWT-based AppUser (mobile)
        app_user = getattr(self.request, "app_user", None)
        if app_user:
            patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                                               .values_list("patient_id", flat=True)
            return qs.filter(patient_id__in=patient_ids)

        # Original fallback: Django-auth → AppUser mapping (for web app)
        app_user = self._current_app_user()
        if not app_user:
            return Complaint.objects.none()

        patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                                           .values_list("patient_id", flat=True)
        return qs.filter(patient_id__in=patient_ids)

    # ---- create -------------------------------------------------------------
    def perform_create(self, serializer):
        data = dict(serializer.validated_data)  # shallow copy for inspection

        patient = data.get("patient")
        admission = data.get("admission")
        ward = data.get("ward")
        bed = data.get("bed")

        # Infer from active admission when missing
        if patient and not admission:
            adm = self._active_admission_for(patient.id)
            if adm:
                admission = adm
                ward = ward or adm.ward
                bed = bed or adm.bed

        extra = {"status": "open"}  # default

        # ✅ Updated: also allow request.app_user (mobile token)
        app_user = getattr(self.request, "app_user", None) or self._current_app_user()

        # If a guardian/patient is posting, stamp user_id and enforce access
        if app_user:
            extra["user_id"] = app_user.id
            if patient and not PatientAccess.objects.filter(
                user_id=app_user.id, patient_id=patient.id
            ).exists():
                raise PermissionError("You do not have access to this patient.")

        serializer.save(
            admission=admission,
            ward=ward,
            bed=bed,
            **extra,
        )

    # ---- guardian convenience endpoint -------------------------------------
    @action(detail=False, methods=["get"], url_path="my")
    def my_complaints(self, request):
        u = request.user
        if not u.is_authenticated:
            return Response({"detail": "Authentication required."}, status=401)

        if u.is_staff:
            qs = self.get_queryset()
        else:
            # ✅ Also check request.app_user first
            app_user = getattr(request, "app_user", None) or self._current_app_user()
            if not app_user:
                return Response([], status=200)
            patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                                               .values_list("patient_id", flat=True)
            qs = self.get_queryset().filter(patient_id__in=patient_ids)

        return Response(self.get_serializer(qs, many=True).data)

    
class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by("-created_at")
    serializer_class = NotificationSerializer
    permission_classes = [StaffWriteOnly]

    filterset_fields = ["created_by", "target_user", "channels"]
    ordering_fields = ["created_at", "read_at"]
    ordering = ["-created_at"]

    def _current_app_user(self):
        """Resolve logged-in Django user to AppUser using email → username → phone → user FK."""
        u = self.request.user

        # Try email
        if getattr(u, "email", None):
            au = AppUser.objects.filter(email__iexact=u.email).first()
            if au: return au

        # Try username
        if getattr(u, "username", None):
            au = AppUser.objects.filter(username__iexact=u.username).first()
            if au: return au

        # Try phone if you store it on Django user (often you don't; skip if not)
        if hasattr(u, "phone") and u.phone:
            au = AppUser.objects.filter(phone=u.phone).first()
            if au: return au

        # Finally, join via FK to auth_user
        au = AppUser.objects.filter(user_id=u.id).first()
        if au:
            return au

        raise ValidationError({"created_by": "No AppUser linked to the current staff user (email/username/phone/user_id)."})

    def _user_has_active_admission(self, app_user):
        patient_ids = PatientAccess.objects.filter(user_id=app_user.id)\
                          .values_list("patient_id", flat=True)
        if not patient_ids:
            return False
        return Admission.objects.filter(
            patient_id__in=patient_ids,
            status__iexact="Active"
        ).exists()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return Notification.objects.none()

        # Staff see everything
        if user.is_staff:
            return qs

        # Resolve to AppUser
        au = None
        # Try email/username/phone first:
        if getattr(user, "email", None):
            au = AppUser.objects.filter(email__iexact=user.email).first()
        if not au and getattr(user, "username", None):
            au = AppUser.objects.filter(username__iexact=user.username).first()
        if not au:
            au = AppUser.objects.filter(user_id=user.id).first()

        if not au:
            # No AppUser mapping → only show directly targeted notifications via auth join
            return qs.filter(target_user__user_id=user.id)

        # Show targeted + (if has active admission) broadcasts
        if self._user_has_active_admission(au):
            return qs.filter(Q(target_user_id=au.id) | Q(target_user__isnull=True))
        return qs.filter(target_user_id=au.id)

    def perform_create(self, serializer):
        serializer.save(created_by=self._current_app_user(), created_at=timezone.now())

    @action(detail=True, methods=["post"], url_path="mark-read",
            permission_classes=[permissions.IsAuthenticated, IsTargetUserOrStaff])
    def mark_read(self, request, pk=None):
        obj = self.get_object()
        if obj.read_at:
            return Response({"detail": "Already read."}, status=status.HTTP_200_OK)
        obj.read_at = timezone.now()
        obj.save(update_fields=["read_at"])
        return Response(NotificationSerializer(obj).data, status=status.HTTP_200_OK)

class MenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer

    def get_queryset(self):
        qs = MenuItem.objects.order_by('category', 'name')
        active = self.request.query_params.get('active')
        if active in ('1', 'true', 'True'):
            qs = qs.filter(is_active=True)
        return qs


class CanteenOrderViewSet(viewsets.ModelViewSet):
    serializer_class = CanteenOrderSerializer

    def get_queryset(self):
        qs = CanteenOrder.objects.select_related('patient').order_by('-created_at')
        user_id = self.request.query_params.get('user')
        patient = self.request.query_params.get('patient')
        status_ = self.request.query_params.get('status')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if patient:
            qs = qs.filter(patient_id=patient)
        if status_:
            qs = qs.filter(status=status_)
        return qs

    def perform_create(self, serializer):
        # total_cents defaults to 0; created_at = now
        serializer.save(created_at=timezone.now(), total_cents=0)

    @action(detail=True, methods=['post'], url_path='add-item')
    @transaction.atomic
    def add_item(self, request, pk=None):
        order = self.get_object()
        mi_id = request.data.get('menu_item')
        qty = int(request.data.get('qty', 1))

        if not mi_id:
            return Response({"detail": "menu_item is required."}, status=status.HTTP_400_BAD_REQUEST)
        if qty <= 0:
            return Response({"detail": "qty must be > 0."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            mi = MenuItem.objects.get(id=mi_id, is_active=True)
        except MenuItem.DoesNotExist:
            return Response({"detail": "Menu item not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        # create order item with current price
        CanteenOrderItem.objects.create(
            order_id=order.id,
            menu_item_id=mi.id,
            qty=qty,
            price_cents=mi.price_cents
        )

        # recompute total
        agg = CanteenOrderItem.objects.filter(order_id=order.id)\
              .values_list('qty', 'price_cents')
        total = sum(q * p for q, p in agg)
        order.total_cents = total
        order.save(update_fields=['total_cents'])

        return Response(CanteenOrderSerializer(order).data, status=status.HTTP_200_OK)
    
class CanteenOrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = CanteenOrderItemSerializer

    def get_queryset(self):
        qs = CanteenOrderItem.objects.select_related('menu_item').order_by('id')
        order_id   = self.request.query_params.get('order')
        menu_item  = self.request.query_params.get('menu_item')
        if order_id:
            qs = qs.filter(order_id=order_id)
        if menu_item:
            qs = qs.filter(menu_item_id=menu_item)
        return qs
    
class PatientRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PatientRecordSerializer

    def get_queryset(self):
        qs = PatientRecord.objects.all().order_by('-created_at')
        q   = self.request.query_params.get('q')
        mrn = self.request.query_params.get('mrn')

        if mrn:
            qs = qs.filter(mrn=mrn)

        if q:
            qs = qs.filter(
                Q(mrn__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q) |
                Q(address__icontains=q) |
                Q(allergies__icontains=q)
            )
        return qs

    # NEW: set created_at on create
    def perform_create(self, serializer):
        try:
            serializer.save(created_at=timezone.now())
        except IntegrityError as e:
            # e.g., duplicate MRN or NOT NULL violation -> 400 instead of 500
            raise ValidationError({'detail': str(e)})
        
class PatientAccessViewSet(viewsets.ModelViewSet):
    serializer_class = PatientAccessSerializer

    def get_queryset(self):
        qs = PatientAccess.objects.select_related('patient').order_by('-id')
        user_id = self.request.query_params.get('user')
        patient = self.request.query_params.get('patient')
        if user_id:
            qs = qs.filter(user_id=user_id)
        if patient:
            qs = qs.filter(patient_id=patient)
        return qs
    
def _generate_otp(n=6) -> str:
    return f"{random.randint(0, 10**n - 1):0{n}d}"


def _mask_destination(dest: str) -> str:
    # basic masking for SMS/email display
    if "@" in dest:
        name, domain = dest.split("@", 1)
        return (name[0] + "***@" + domain) if name else "***@" + domain
    # phone-like
    if len(dest) >= 4:
        return "***" + dest[-4:]
    return "***"


class OtpSendView(APIView):
    """
    POST /api/otp/send/
    Body: {"destination":"<email or phone>", "purpose":"signup" | "login"}
    Public endpoint (no auth). Stores hashed OTP; returns debug_code in DEBUG.
    """
    permission_classes = (AllowAny,)
    authentication_classes = []  # disable SessionAuthentication -> no CSRF requirement

    def post(self, request):
        destination = (request.data.get("destination") or "").strip()
        purpose = (request.data.get("purpose") or "signup").strip()

        if not destination:
            return Response({"detail": "destination is required."}, status=400)

        # 6-digit OTP
        code = f"{random.randint(0, 999999):06d}"
        expires_at = timezone.now() + timedelta(minutes=5)

        OtpCode.objects.create(
            destination=destination,
            purpose=purpose,
            code_hash=make_password(code),
            expires_at=expires_at,
        )

        resp = {
            "ok": True,
            "expires_in": 300,
        }
        if settings.DEBUG:
            resp["debug_code"] = code
        print(f"[OTP DEBUG] {purpose} for {destination}: {code} (valid 5m)")

        return Response(resp, status=status.HTTP_201_CREATED)


class OtpVerifyView(APIView):
    def post(self, request):
        ser = OtpVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        dest = ser.validated_data["destination"]
        purpose = ser.validated_data["purpose"]
        code = ser.validated_data["code"]

        now = timezone.now()
        # get most recent valid OTP for this destination & purpose
        otp = (
            OtpCode.objects
            .filter(destination=dest, purpose=purpose, expires_at__gte=now)
            .order_by("-expires_at", "-id")
            .first()
        )

        if not otp:
            return Response({"valid": False, "detail": "OTP expired or not found."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not check_password(code, otp.code_hash):
            return Response({"valid": False, "detail": "Invalid code."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Optional: mark as “used” if your table has a used_at column
        if hasattr(otp, "used_at"):
            otp.used_at = now
            otp.save(update_fields=["used_at"])

        return Response({"valid": True, "destination": _mask_destination(dest), "purpose": purpose},
                        status=status.HTTP_200_OK)

class AppUserSignupView(APIView):
    """
    Create a new AppUser after OTP verification.
    Body: { "destination": "<email or phone>", "code": "123456", "username": "optional", "role": "patient/guardian/etc" }
    Returns: { token, app_user: {...} }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        dest = request.data.get("destination")
        code = request.data.get("code")
        username = request.data.get("username") or None
        role = (request.data.get("role") or "patient").lower()

        if not dest or not code:
            return Response({"detail": "destination and code are required."}, status=400)

        # Reuse your existing OTP verify logic:
        from django.utils import timezone
        now = timezone.now()
        otp = (
            OtpCode.objects
            .filter(destination=dest, purpose__in=["signup", "login"], expires_at__gte=now)
            .order_by("-expires_at", "-id")
            .first()
        )
        if not otp:
            return Response({"detail": "OTP expired or not found."}, status=400)
        if not check_password(code, otp.code_hash):
            return Response({"detail": "Invalid OTP."}, status=400)

        # Create or get AppUser
        au, created = AppUser.objects.get_or_create(
            email=dest if "@" in dest else None,
            phone=None if "@" in dest else dest,
            defaults={
                "username": username or (dest.split("@")[0] if "@" in dest else dest[-4:]),
                "role": role,
                "is_active": True,
                "created_at": timezone.now(),
            }
        )
        # If the same destination existed but inactive, activate:
        if not created and not au.is_active:
            au.is_active = True
            au.save(update_fields=["is_active"])

        token = create_appuser_jwt(au.id)

        return Response({
            "token": token,
            "app_user": {
                "id": au.id,
                "email": au.email,
                "phone": au.phone,
                "username": au.username,
                "role": au.role,
                "is_active": au.is_active,
            }
        }, status=200)


class AppUserLoginView(APIView):
    """
    POST /api/app/auth/login/
    Body: { "destination": "<email or phone>", "code": "123456" }
    Returns: { "token": "<jwt>", "app_user": {...} }
    Notes:
      - Verifies OTP using code_hash (no 'code' column in DB).
      - Accepts OTP generated for purpose 'login' or 'signup'.
      - Marks OTP as consumed (if your schema has consumed_at).
      - Issues a 30-day JWT so user doesn't need OTP every time.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        dest = (request.data.get("destination") or "").strip()
        code = (request.data.get("code") or "").strip()

        if not dest or not code:
            return Response({"detail": "destination and code are required."}, status=400)

        now = timezone.now()

        # Find the most recent, unconsumed, unexpired OTP for this destination (login/signup)
        otp = (
            OtpCode.objects
            .filter(destination=dest,
                    purpose__in=["login", "signup"],
                    expires_at__gte=now)
            .order_by("-expires_at", "-id")
            .first()
        )
        if not otp:
            return Response({"detail": "OTP expired or not found."}, status=400)

        # Verify the raw code against the stored hash
        if not check_password(code, otp.code_hash):
            return Response({"detail": "Invalid OTP."}, status=400)

        # Mark consumed if your schema supports it
        if hasattr(otp, "consumed_at") and otp.consumed_at is None:
            otp.consumed_at = now
            otp.save(update_fields=["consumed_at"])

        # Find or create the AppUser mapped to the destination
        if "@" in dest:
            au = AppUser.objects.filter(email__iexact=dest, is_active=True).first()
            if not au:
                au = AppUser.objects.create(
                    email=dest,
                    phone=None,
                    username=dest.split("@")[0] or dest,
                    role="patient",
                    is_active=True,
                    created_at=now,
                )
        else:
            au = AppUser.objects.filter(phone=dest, is_active=True).first()
            if not au:
                au = AppUser.objects.create(
                    email=None,
                    phone=dest,
                    username=dest[-4:] if len(dest) >= 4 else dest,
                    role="patient",
                    is_active=True,
                    created_at=now,
                )

        # Issue a long-lived JWT (30 days by default)
        token = create_appuser_jwt(au.id, days_valid=30)

        return Response({
            "token": token,
            "app_user": AppUserSerializer(au).data
        }, status=200)

class AppUserMeView(APIView):
    """
    Read current AppUser profile using Bearer token. 
    Uses AppUserJWTAuthentication (attached in settings).
    """
    def get(self, request):
        au = getattr(request, "app_user", None)
        if not au:
            return Response({"detail": "Unauthorized"}, status=401)
        return Response({
            "id": au.id,
            "email": au.email,
            "phone": au.phone,
            "username": au.username,
            "role": au.role,
            "is_active": au.is_active,
        })


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = User.objects.create_user(
            username=ser.validated_data["username"],
            password=ser.validated_data["password"],
            email=ser.validated_data.get("email", "")
        )

        return Response(
            {"id": user.id, "username": user.username, "email": user.email},
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=ser.validated_data["username"],
            password=ser.validated_data["password"]
        )
        if not user:
            return Response({"detail": "Invalid credentials."}, status=400)

        # For token auth, we don't need to call login(); but it won't hurt.
        login(request, user)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "ok": True,
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "token": token.key,        # ← MOBILE WILL USE THIS
        })



class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"ok": True})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_staff": u.is_staff,
            "is_superuser": u.is_superuser,
        })
    
class MedicalOrderViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalOrderSerializer

    def get_queryset(self):
        qs = (MedicalOrder.objects
              .select_related('admission')
              .order_by('-created_at'))

        p = self.request.query_params
        if p.get('admission'):
            qs = qs.filter(admission_id=p['admission'])
        if p.get('patient'):
            qs = qs.filter(admission__patient_id=p['patient'])
        if p.get('type'):
            qs = qs.filter(order_type=p['type'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('from'):
            qs = qs.filter(created_at__date__gte=p['from'])
        if p.get('to'):
            qs = qs.filter(created_at__date__lte=p['to'])
        return qs

    def perform_create(self, serializer):
        # If client omits timestamp or status, set safe defaults
        data = dict(serializer.validated_data)
        if 'status' not in data:
            data['status'] = 'ordered'
        serializer.save(created_at=timezone.now(), **data)

def _time_range(start_t: time, end_t: time, step_minutes: int):
    """Yield times from start_t to end_t (exclusive) every step_minutes."""
    dt = datetime.combine(datetime.today().date(), start_t)
    end_dt = datetime.combine(datetime.today().date(), end_t)
    step = timedelta(minutes=step_minutes)
    while dt < end_dt:
        yield dt.time()
        dt += step

class SlotsView(APIView):
    def get(self, request):
        doctor_id = request.query_params.get("doctor")
        date_str  = request.query_params.get("date")

        if not doctor_id or not date_str:
            return Response(
                {"detail": "doctor and date are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # validate doctor
        try:
            Doctor.objects.only("id").get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        # parse date
        try:
            the_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Invalid date format. Use YYYY-MM-DD."},
                            status=status.HTTP_400_BAD_REQUEST)

        # working window
        start_s = request.query_params.get("start", "09:00")
        end_s   = request.query_params.get("end",   "17:00")
        step_s  = request.query_params.get("step",  "30")

        try:
            start_t = datetime.strptime(start_s, "%H:%M").time()
            end_t   = datetime.strptime(end_s, "%H:%M").time()
            step    = int(step_s)
            assert step > 0
        except Exception:
            return Response({"detail": "Invalid start/end/step."}, status=status.HTTP_400_BAD_REQUEST)

        # fetch taken slots for that doctor/date where status is not cancelled
        taken = set(
            Booking.objects
                   .filter(doctor_id=doctor_id, slot_date=the_date)
                   .exclude(status__iexact="cancelled")
                   .values_list("slot_time", flat=True)
        )
        # slot_time is a time field; normalize to "HH:MM"
        taken_str = {t.strftime("%H:%M") for t in taken}

        # build full range and subtract taken
        all_slots = [t.strftime("%H:%M") for t in _time_range(start_t, end_t, step)]
        available = [s for s in all_slots if s not in taken_str]

        return Response({
            "doctor": int(doctor_id),
            "date": the_date.strftime("%Y-%m-%d"),
            "start": start_t.strftime("%H:%M"),
            "end": end_t.strftime("%H:%M"),
            "step_minutes": step,
            "slots": available
        })
    
def _safe_path(base: Path, name: str) -> Path:
    p = (base / name).resolve()
    if not str(p).startswith(str(base.resolve())):
        raise Http404("Invalid path")
    return p

# inside your existing ReportViewSet class

class WardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ward.objects.all().order_by('name')
    serializer_class = WardSerializer


class BedViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BedSerializer

    def get_queryset(self):
        qs = Bed.objects.select_related('ward').order_by('ward_id', 'code')
        ward_id = self.request.query_params.get('ward')
        status_ = self.request.query_params.get('status')
        if ward_id:
            qs = qs.filter(ward_id=ward_id)
        if status_:
            qs = qs.filter(status__iexact=status_)
        return qs

class AppUserPasswordLoginView(APIView):
    """
    POST /api/app/auth/login-password/
    Body: {"destination": "<email or phone>", "password": "<secret>"}
    Returns: {"token": "<jwt>", "app_user": {...}}
    """
    permission_classes = (AllowAny,)

    def post(self, request):
        dest = (request.data.get("destination") or "").strip()
        raw_pw = (request.data.get("password") or "")
        if not dest or not raw_pw:
            return Response({"detail": "destination and password are required."}, status=400)

        # Find AppUser by email or phone
        if "@" in dest:
            au = AppUser.objects.filter(email__iexact=dest, is_active=True).first()
        else:
            au = AppUser.objects.filter(phone=dest, is_active=True).first()

        if not au:
            return Response({"detail": "Account not found."}, status=400)

        # Support either `password_hash` or `password` field (whichever your model uses)
        stored_hash = getattr(au, "password_hash", None) or getattr(au, "password", None)
        if not stored_hash or not check_password(raw_pw, stored_hash):
            return Response({"detail": "Invalid credentials."}, status=400)

        token = create_appuser_jwt(au.id, days_valid=30)
        return Response({"token": token, "app_user": AppUserSerializer(au).data}, status=200)


class AppUserSignupVerifyView(APIView):
    """
    POST /api/app/auth/signup-verify/
    Body: {"destination": "<email or phone>", "code": "<otp>", "password": "<new_pw>"}
    Creates a NEW AppUser after OTP verify.
    """
    permission_classes = (AllowAny,)
    authentication_classes = []  # public endpoint

    def post(self, request):
        dest = (request.data.get("destination") or "").strip()
        code = (request.data.get("code") or "").strip()
        raw_pw = (request.data.get("password") or "")
        if not dest or not code or not raw_pw:
            return Response({"detail": "destination, code and password are required."}, status=400)

        # 1) Find latest valid OTP for this destination (signup OR login)
        now = timezone.now()
        otp = (
            OtpCode.objects
            .filter(destination=dest, purpose__in=["signup", "login"], expires_at__gte=now)
            .order_by("-expires_at", "-id")
            .first()
        )
        if not otp:
            return Response({"detail": "OTP not found or expired."}, status=400)
        if hasattr(otp, "consumed_at") and otp.consumed_at:
            return Response({"detail": "OTP already used."}, status=400)
        if not check_password(code, otp.code_hash):
            return Response({"detail": "Invalid OTP."}, status=400)

        # 2) Do not allow duplicate accounts
        email_dest = "@" in dest
        already = AppUser.objects.filter(email__iexact=dest).exists() if email_dest \
                  else AppUser.objects.filter(phone=dest).exists()
        if already:
            return Response({"detail": "User already exists. Please login."}, status=400)

        # 3) Create AppUser with ALL required columns filled
        try:
            with transaction.atomic():
                username = (dest.split("@")[0] if email_dest else (dest[-4:] if len(dest) >= 4 else dest)) or "user"
                au = AppUser(
                    email=dest if email_dest else None,
                    phone=None if email_dest else dest,
                    username=username,
                    password_hash=make_password(raw_pw),  # store hashed password
                    role="patient",                        # default role for mobile user
                    is_active=True,
                    created_at=now,                        # REQUIRED by your model
                )
                au.save()

                # mark OTP consumed if field exists
                if hasattr(otp, "consumed_at") and not otp.consumed_at:
                    otp.consumed_at = now
                    otp.save(update_fields=["consumed_at"])

        except IntegrityError as e:
            return Response({"detail": f"Database error: {str(e)}"}, status=500)

        # 4) Issue long-lived token (e.g., 30 days)
        token = create_appuser_jwt(au.id, days_valid=30)
        return Response({"token": token, "app_user": AppUserSerializer(au).data}, status=201)
