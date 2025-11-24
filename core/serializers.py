from django.contrib.auth import get_user_model
User = get_user_model()
from rest_framework import serializers
from .models import Department, Doctor, Booking, Admission, AdmissionTask, MenuItem, Report, Complaint, Notification, MenuItem, CanteenOrder, CanteenOrderItem, PatientRecord, PatientAccess, MedicalOrder, AppUser, Ward, Bed


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at']

class DoctorSerializer(serializers.ModelSerializer):
    department_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Doctor
        fields = ['id', 'full_name', 'qualification', 'experience_years', 'department_id']
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        # keep these in the same order you show in admin
        fields = [
            'id', 'booking_type', 'patient', 'department', 'doctor',
            'slot_date', 'slot_time', 'status', 'created_at', 'notes'
        ]
        read_only_fields = ['id', 'status', 'created_at']

    # ---- VALIDATION RULES ----
    def validate(self, data):
        dept = data.get('department')
        doc = data.get('doctor')
        slot_date = data.get('slot_date')
        slot_time = data.get('slot_time')

        # 1) doctor must belong to the chosen department
        if doc and dept and doc.department_id != dept.id:
            raise serializers.ValidationError(
                {"doctor": "Selected doctor does not belong to the chosen department."}
            )

        # 2) prevent duplicate bookings of the same doctor slot
        if doc and slot_date and slot_time:
            exists = Booking.objects.filter(
                doctor=doc,
                slot_date=slot_date,
                slot_time=slot_time
            ).exists()
            if exists:
                raise serializers.ValidationError(
                    {"slot_time": "This time slot is already booked for the selected doctor."}
                )
        return data

    # optional: set default status on create
    def create(self, validated_data):
        if 'status' not in validated_data:
            validated_data['status'] = 'pending'
        return super().create(validated_data)
    
class AppUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = [
            "id", "email", "phone", "username",
            "password_hash", "role", "is_active", "created_at"
        ]
        read_only_fields = ["id", "created_at"]   
    
class AdmissionSerializer(serializers.ModelSerializer):
    # Read-only projections for nicer UI labels
    patient_mrn   = serializers.CharField(source='patient.mrn', read_only=True)
    patient_name  = serializers.SerializerMethodField()
    ward_name     = serializers.CharField(source='ward.name', read_only=True)
    bed_code      = serializers.CharField(source='bed.code', read_only=True)
    doctor_name   = serializers.CharField(source='doctor.full_name', read_only=True)

    class Meta:
        model = Admission
        # keep existing writeable FKs for create/update, add read-only projections
        fields = [
            'id', 'patient', 'ward', 'bed', 'doctor',
            'status', 'admit_time', 'discharge_time', 'notes',

            # new read-only helpers:
            'patient_mrn', 'patient_name', 'ward_name', 'bed_code', 'doctor_name',
        ]
        read_only_fields = ['patient_mrn', 'patient_name', 'ward_name', 'bed_code', 'doctor_name']

    def get_patient_name(self, obj):
        fn = getattr(obj.patient, 'first_name', '') or ''
        ln = getattr(obj.patient, 'last_name', '') or ''
        return (fn + ' ' + ln).strip()


class AdmissionTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionTask
        fields = [
            'id', 'admission', 'title', 'details',
            'due_date', 'status', 'created_at', 'updated_at'
        ]


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id', 'patient', 'admission', 'report_type',
            'file_name', 'object_key', 'mime_type',
            'size_bytes', 'checksum_sha256',
            'uploaded_by', 'uploaded_at', 'notes'
        ]

class ComplaintSerializer(serializers.ModelSerializer):
    # Optional inputs (auto-filled from active admission if omitted)
    admission = serializers.PrimaryKeyRelatedField(
        queryset=Admission.objects.all(), required=False, allow_null=True
    )
    ward = serializers.PrimaryKeyRelatedField(
        queryset=Ward.objects.all(), required=False, allow_null=True
    )
    bed = serializers.PrimaryKeyRelatedField(
        queryset=Bed.objects.all(), required=False, allow_null=True
    )

    # NEW: read-only projections for UI
    patient_name = serializers.SerializerMethodField(read_only=True)
    patient_mrn  = serializers.SerializerMethodField(read_only=True)
    ward_name    = serializers.SerializerMethodField(read_only=True)
    bed_code     = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "patient", "admission", "ward", "bed",
            "category",
            "description",
            "status",
            "created_at", "resolved_at",
            # projections:
            "patient_name", "patient_mrn", "ward_name", "bed_code",
        ]
        read_only_fields = ["status", "created_at", "resolved_at",
                            "patient_name", "patient_mrn", "ward_name", "bed_code"]

    # ---------------- helpers (existing) ----------------
    def _active_admission(self, patient):
        return (
            Admission.objects
            .filter(patient_id=patient.id, status__iexact="active")
            .order_by("-admit_time")
            .first()
        )

    def validate(self, data):
        patient = data.get("patient")
        admission = data.get("admission")
        ward = data.get("ward")
        bed = data.get("bed")

        if patient and not admission:
            adm = self._active_admission(patient)
            if adm:
                data["admission"] = adm
                data.setdefault("ward", adm.ward)
                data.setdefault("bed", adm.bed)

        if data.get("admission"):
            adm = data["admission"]
            if not ward:
                data["ward"] = adm.ward
            if not bed:
                data["bed"] = adm.bed

        return data

    # --------------- projection getters ----------------
    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if not p:
            return None
        first = (p.first_name or "").strip()
        last  = (p.last_name or "").strip()
        full  = f"{first} {last}".strip()
        return full or None

    def get_patient_mrn(self, obj):
        p = getattr(obj, "patient", None)
        return getattr(p, "mrn", None) if p else None

    def get_ward_name(self, obj):
        w = getattr(obj, "ward", None)
        return getattr(w, "name", None) if w else None

    def get_bed_code(self, obj):
        b = getattr(obj, "bed", None)
        return getattr(b, "code", None) if b else None


class NotificationSerializer(serializers.ModelSerializer):
    target_user = serializers.SlugRelatedField(
        slug_field="email",
        queryset=AppUser.objects.all(),
        required=False,
        allow_null=True
    )
    created_by = serializers.SlugRelatedField(
        slug_field="email", read_only=True
    )

    unread = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "title", "message", "channels",
            "created_by", "target_user",
            "created_at", "read_at", "unread",
        ]
        read_only_fields = ["created_at", "read_at", "unread", "created_by"]

    def get_unread(self, obj):
        return obj.read_at is None
    
class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'category', 'price_cents', 'is_active']


class CanteenOrderItemSerializer(serializers.ModelSerializer):
    # This adds a new derived field showing price in rupees
    price_rupees = serializers.SerializerMethodField()

    class Meta:
        model = CanteenOrderItem
        fields = ['id', 'menu_item', 'qty', 'price_cents', 'price_rupees']

    def get_price_rupees(self, obj):
        return float((obj.price_cents or 0) / 100.0)


class CanteenOrderSerializer(serializers.ModelSerializer):
    # Inline list of items + total in rupees
    items = CanteenOrderItemSerializer(many=True, read_only=True)
    total_rupees = serializers.SerializerMethodField()

    # NEW: read-only projections so UI can show rich info without extra requests
    patient_mrn = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    ward_name = serializers.SerializerMethodField()
    bed_code = serializers.SerializerMethodField()

    class Meta:
        model = CanteenOrder
        fields = [
            'id', 'user', 'patient', 'status',
            'total_cents', 'total_rupees', 'created_at', 'paid_at',
            # new projections ↓
            'patient_mrn', 'patient_name', 'ward_name', 'bed_code',
            'items'
        ]
        read_only_fields = ['id', 'total_cents', 'created_at', 'paid_at']

    def get_total_rupees(self, obj):
        return float((obj.total_cents or 0) / 100.0)

    def get_patient_mrn(self, obj):
        p = getattr(obj, "patient", None)
        return getattr(p, "mrn", None) if p else None

    def get_patient_name(self, obj):
        p = getattr(obj, "patient", None)
        if not p:
            return None
        first = getattr(p, "first_name", "") or ""
        last = getattr(p, "last_name", "") or ""
        full = f"{first} {last}".strip()
        return full or None

    def _active_admission_for(self, patient_id):
        return (
            Admission.objects
            .filter(patient_id=patient_id, status__iexact="active")
            .order_by("-admit_time")
            .first()
        )

    def get_ward_name(self, obj):
        p = getattr(obj, "patient", None)
        if not p:
            return None
        adm = self._active_admission_for(p.id)
        return getattr(getattr(adm, "ward", None), "name", None) if adm else None

    def get_bed_code(self, obj):
        p = getattr(obj, "patient", None)
        if not p:
            return None
        adm = self._active_admission_for(p.id)
        return getattr(getattr(adm, "bed", None), "code", None) if adm else None



class PatientRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientRecord
        fields = [
            'id', 'mrn', 'first_name', 'last_name',
            'sex', 'dob', 'blood_group',
            'allergies', 'address',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']  # <-- important


class PatientAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAccess
        fields = ['id', 'user', 'patient', 'relationship']  # <-- role
        read_only_fields = ['id']

class OtpSendSerializer(serializers.Serializer):
    destination = serializers.CharField(max_length=255)  # email or phone
    purpose = serializers.ChoiceField(choices=["signup", "login", "reset"])


class OtpVerifySerializer(serializers.Serializer):
    destination = serializers.CharField(max_length=255)
    purpose = serializers.ChoiceField(choices=["signup", "login", "reset"])
    code = serializers.CharField(max_length=10)

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_username(self, v):
        if User.objects.filter(username=v).exists():
            raise serializers.ValidationError("Username already taken.")
        return v


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class MedicalOrderSerializer(serializers.ModelSerializer):
    # Expose useful read-only projections without changing DB:
    patient_id = serializers.IntegerField(source='admission.patient_id', read_only=True)

    class Meta:
        model = MedicalOrder
        fields = [
            'id',
            'admission',         
            'patient_id',        
            'created_by',        
            'order_type',
            'status',
            'created_at',
            'payload_json',      
        ]
        read_only_fields = ['id', 'created_at']

class ReportUploadSerializer(serializers.Serializer):
    patient    = serializers.PrimaryKeyRelatedField(queryset=PatientRecord.objects.all())
    admission  = serializers.PrimaryKeyRelatedField(queryset=Admission.objects.all(), required=False, allow_null=True)
    report_type = serializers.ChoiceField(choices=["lab", "imaging", "discharge", "billing", "other"])
    file        = serializers.FileField()  # expects a PDF, but we’ll accept any file for now
    notes       = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = ["id", "name", "floor", "department"]

class BedSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source='ward.name', read_only=True)

    class Meta:
        model = Bed
        fields = ['id', 'ward', 'ward_name', 'code', 'status']
