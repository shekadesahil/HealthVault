from django.contrib import admin, messages
from decimal import Decimal
from django import forms
from django.db.models import Sum, F


from .models import Department, PatientRecord, Ward, Bed, Doctor, Admission, AdmissionTask, Report, Booking, Complaint, Notification, CanteenOrder, CanteenOrderItem, MenuItem, OtpCode, PatientAccess, MedicalOrder, AppUser

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'description', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_at',)
    ordering = ('name',)

@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ('id','name','floor','department','notes')
    list_filter = ('department','floor')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ('id','code','status','ward')
    list_filter = ('status','ward')
    search_fields = ('code',)
    ordering = ('ward','code')
    list_select_related = ('ward',)

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'department', 'qualification', 'experience_years')
    list_filter = ('department','qualification')
    search_fields = ('full_name', 'qualification')
    ordering = ('full_name',)
    list_select_related = ('department',)

@admin.register(PatientRecord)
class PatientRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'mrn', 'first_name', 'last_name', 'sex', 'dob', 'blood_group')
    search_fields = ('mrn', 'first_name', 'last_name')
    ordering = ('last_name', 'first_name')

@admin.register(Admission)
class AdmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'ward', 'bed', 'status', 'admit_time', 'discharge_time')
    list_filter = ('status', 'ward')
    search_fields = ('patient__first_name', 'patient__last_name', 'notes')
    ordering = ('-admit_time',)
    list_select_related = ('patient', 'ward', 'bed')

@admin.register(AdmissionTask)
class AdmissionTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'admission', 'title', 'status', 'due_date', 'created_at')
    list_filter = ('status',)
    search_fields = ('title', 'details')
    ordering = ('-created_at',)
    list_select_related = ('admission',)

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'admission', 'report_type', 'file_name', 'uploaded_by', 'uploaded_at')
    list_filter = ('report_type',)
    search_fields = ('file_name', 'notes', 'patient__first_name', 'patient__last_name')
    ordering = ('-uploaded_at',)
    list_select_related = ('patient', 'admission')

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking_type', 'patient', 'department', 'doctor', 'slot_date', 'slot_time', 'status', 'created_at')
    list_filter = ('booking_type', 'status', 'department')
    search_fields = ('notes', 'patient__first_name', 'patient__last_name', 'doctor__full_name')
    ordering = ('-created_at',)
    list_select_related = ('patient', 'department', 'doctor')

#################################################################################################
@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'ward', 'bed', 'category', 'status', 'created_at', 'resolved_at')
    list_filter = ('status', 'category', 'ward')
    search_fields = ('description', 'patient__first_name', 'patient__last_name', 'patient__mrn', 'ward__name', 'bed__code')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    list_select_related = ('patient', 'ward', 'bed')

    # We do NOT expose 'user' in the form; we stamp it automatically.
    exclude = ('user',)

    def save_model(self, request, obj, form, change):
        
        # 1) Stamp the complaint's user (guardian/staff mapped to AppUser)
        if not getattr(obj, 'user_id', None):
            app_user = None
            if getattr(request.user, 'email', None):
                try:
                    app_user = AppUser.objects.get(email__iexact=request.user.email)
                except AppUser.DoesNotExist:
                    app_user = None
            if app_user:
                obj.user_id = app_user.id
            else:
                # If we can’t map, show a friendly message and block save
                messages.error(request, "Could not map your admin login to an AppUser (by email). Create an AppUser with your email first.")
                return  # do not save — prevents DB IntegrityError

        # 2) Infer admission/ward/bed from active admission when missing
        if obj.patient_id and (not obj.admission_id or not obj.ward_id or not obj.bed_id):
            adm = (
                Admission.objects
                .filter(patient_id=obj.patient_id, status__iexact='active')
                .order_by('-admit_time')
                .first()
            )
            if adm:
                if not obj.admission_id:
                    obj.admission_id = adm.id
                if not obj.ward_id:
                    obj.ward_id = adm.ward_id
                if not obj.bed_id:
                    obj.bed_id = adm.bed_id

        super().save_model(request, obj, form, change)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_by', 'target_user', 'title', 'channels', 'created_at', 'read_at')
    list_filter = ('channels', 'created_at')
    search_fields = ('title', 'message')
    ordering = ('-created_at',)
    list_select_related = ('created_by', 'target_user')

class CanteenOrderItemInlineForm(forms.ModelForm):
    # Staff will type rupees here
    unit_price_rupees = forms.DecimalField(
        label="Unit price (₹)",
        min_value=0,
        decimal_places=2,
        required=False,
        help_text="If empty, the current Menu item price is used."
    )

    class Meta:
        model = CanteenOrderItem
        fields = ("menu_item", "qty", "unit_price_rupees")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.fields["unit_price_rupees"].initial = Decimal(self.instance.price_cents or 0) / Decimal(100)

    def clean(self):
        data = super().clean()
        upr = data.get("unit_price_rupees")
        if upr is not None:
            self.instance.price_cents = int(Decimal(upr) * 100)
        else:
            mi = data.get("menu_item") or self.instance.menu_item
            if mi:
                self.instance.price_cents = mi.price_cents
        return data

class CanteenOrderItemInline(admin.TabularInline):
    model = CanteenOrderItem
    fk_name = "order"
    extra = 0
    fields = ("menu_item", "qty", "unit_price_rupees", "line_total_rupees")
    readonly_fields = ("unit_price_rupees", "line_total_rupees")
    raw_id_fields = ("menu_item",)

    # show unit price taken from MenuItem (₹)
    def unit_price_rupees(self, obj):
        if not obj or not obj.menu_item_id:
            return "-"
        cents = obj.menu_item.price_cents or 0
        return f"₹{cents/100:.2f}"
    unit_price_rupees.short_description = "Unit price (₹)"

    # show line total = qty × unit price (₹)
    def line_total_rupees(self, obj):
        if not obj or not obj.menu_item_id or not obj.qty:
            return "-"
        cents = (obj.menu_item.price_cents or 0) * obj.qty
        return f"₹{cents/100:.2f}"
    line_total_rupees.short_description = "Line total (₹)"


@admin.register(CanteenOrder)
class CanteenOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "patient", "status", "total_rupees", "created_at", "paid_at")
    list_filter  = ("status", "created_at")
    search_fields = ("patient__first_name", "patient__last_name")
    ordering = ("-created_at",)
    inlines = [CanteenOrderItemInline]
    readonly_fields = ("total_cents", "total_rupees")

    def total_rupees(self, obj):
        return f"₹{(obj.total_cents or 0)/100:.2f}"
    total_rupees.short_description = "Total (₹)"

    def save_model(self, request, obj, form, change):
        if not obj.created_at:
            obj.created_at = timezone.now()
        # don't let staff type totals; we recompute below
        obj.total_cents = obj.total_cents or 0
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        """
        When saving inline items:
        - Force each item's price_cents from the selected MenuItem (authoritative).
        - After all items are saved, recompute order.total_cents.
        """
        instances = formset.save(commit=False)

        # Save/Update children with authoritative price
        for inst in instances:
            if isinstance(inst, CanteenOrderItem):
                if inst.menu_item_id:
                    inst.price_cents = inst.menu_item.price_cents  # lock unit price
            inst.save()

        # Handle deletes
        for obj in formset.deleted_objects:
            obj.delete()

        # Recompute order total directly from DB
        agg = CanteenOrderItem.objects.filter(order=form.instance).values_list("qty", "price_cents")
        total = sum(q * p for q, p in agg)
        form.instance.total_cents = total
        form.instance.save(update_fields=["total_cents"])


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'price_cents', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(OtpCode)
class OtpCodeAdmin(admin.ModelAdmin):
    list_display = ('id', 'destination', 'purpose', 'expires_at', 'consumed_at')
    list_filter = ('purpose', 'expires_at')
    search_fields = ('destination',)
    ordering = ('-expires_at',)


@admin.register(PatientAccess)
class PatientAccessAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'patient', 'relationship')
    list_filter = ('relationship',)
    search_fields = ('user__username', 'patient__mrn')
    ordering = ('-id',)
    list_select_related = ('user', 'patient')

@admin.register(MedicalOrder)
class MedicalOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_type', 'status', 'admission', 'created_by', 'created_at')
    list_filter  = ('order_type', 'status')
    search_fields = ('admission__notes',)
    ordering = ('-created_at',)
    list_select_related = ('admission', 'created_by')

@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ("id", "username", "email", "phone", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("username", "email", "phone")
    ordering = ("-created_at",)