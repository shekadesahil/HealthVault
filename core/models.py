from django.db import models

class Department(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()
    
    class Meta:
        db_table = 'department'
        managed = False
        ordering = ['name']

    def __str__(self):
        return self.name

class Ward(models.Model):
    id = models.BigAutoField(primary_key=True)
    # FK to department.id
    department = models.ForeignKey(
        'Department',
        on_delete=models.DO_NOTHING,
        db_column='department_id',
        related_name='wards',
        null=True, blank=True,
    )
    name = models.CharField(max_length=100)
    floor = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'ward'
        managed = False
        ordering = ['name']

    def __str__(self):
        return self.name
    
class Bed(models.Model):
    id = models.BigAutoField(primary_key=True)
    # FK to ward.id
    ward = models.ForeignKey(
        'Ward',
        on_delete=models.DO_NOTHING,
        db_column='ward_id',
        related_name='beds',
    )
    code = models.CharField(max_length=20)
    status = models.CharField(max_length=16)  # e.g., available/occupied/reserved

    class Meta:
        db_table = 'bed'
        managed = False
        ordering = ['ward', 'code']

    def __str__(self):
        ward_name = getattr(self.ward, "name", None)
        return f"{ward_name or 'No Ward'} - {self.code}"
    
class Doctor(models.Model):
    id = models.BigAutoField(primary_key=True)
    # FK to department.id
    department = models.ForeignKey(
        'Department',
        on_delete=models.DO_NOTHING,
        db_column='department_id',
        related_name='doctors',
        null=True, blank=True,
    )
    full_name = models.CharField(max_length=120, db_column='full_name')
    qualification = models.CharField(max_length=100, blank=True, null=True)
    experience_years = models.IntegerField(blank=True, null=True)

    class Meta:
        db_table = 'doctor'
        managed = False
        ordering = ['full_name']

    def __str__(self):
        return self.full_name or "Unnamed Doctor"
    

class PatientRecord(models.Model):
    id = models.BigAutoField(primary_key=True)
    mrn = models.CharField(max_length=32, unique=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    sex = models.CharField(max_length=12, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    blood_group = models.CharField(max_length=8, blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = 'patient_record'   # exact Postgres table name
        managed = False               # don’t let Django create/alter it
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} (MRN {self.mrn})"

# ---------- Admission ----------
class Admission(models.Model):
    id = models.BigAutoField(primary_key=True)
    patient = models.ForeignKey('PatientRecord', on_delete=models.PROTECT,
                                db_column='patient_id', related_name='admissions')     
    ward = models.ForeignKey('Ward', on_delete=models.PROTECT,
                             db_column='ward_id', related_name='admissions')         
    bed = models.ForeignKey('Bed', on_delete=models.PROTECT,
                            db_column='bed_id', related_name='admissions')              
    doctor = models.ForeignKey(
        'Doctor', on_delete=models.DO_NOTHING,
        db_column='doctor_id', related_name='admissions',
        null=True, blank=True)
    admit_time = models.DateTimeField()                                                
    discharge_time = models.DateTimeField(blank=True, null=True)                       
    status = models.CharField(max_length=16)                                           
    notes = models.TextField(blank=True, null=True)                                    

    class Meta:
        db_table = 'admission'
        managed = False
        ordering = ['-admit_time']

    def __str__(self):
        return f"Admission #{self.id} • {self.patient} • {self.status}"


# ---------- Admission Task (MUPREL) ----------
class AdmissionTask(models.Model):
    id = models.BigAutoField(primary_key=True)
    admission = models.ForeignKey('Admission', on_delete=models.CASCADE,
                                  db_column='admission_id', related_name='tasks')       
    title = models.CharField(max_length=120)                                           
    details = models.TextField(blank=True, null=True)                                 
    due_date = models.DateField(blank=True, null=True)                                 
    status = models.CharField(max_length=16)                                          
    created_at = models.DateTimeField()                                               
    updated_at = models.DateTimeField()                                               

    class Meta:
        db_table = 'admission_task'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"


# ---------- Report (file metadata) ----------
class Report(models.Model):
    id = models.BigAutoField(primary_key=True)
    patient = models.ForeignKey('PatientRecord', on_delete=models.PROTECT,
                                db_column='patient_id', related_name='reports')          
    admission = models.ForeignKey('Admission', on_delete=models.SET_NULL,
                                  db_column='admission_id', related_name='reports',
                                  blank=True, null=True)                                  
    report_type = models.CharField(max_length=32)                                         
    file_name = models.CharField(max_length=255)                                       
    object_key = models.CharField(max_length=512)                                      
    mime_type = models.CharField(max_length=80)                                        
    size_bytes = models.BigIntegerField(blank=True, null=True)                         
    checksum_sha256 = models.CharField(max_length=64, blank=True, null=True)           
    uploaded_by = models.BigIntegerField()                                               
    uploaded_at = models.DateTimeField()                                                 
    notes = models.TextField(blank=True, null=True)                                     

    class Meta:
        db_table = 'report'
        managed = False
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.report_type} • {self.file_name}"


# ---------- Booking (appointments & labs) ----------
class Booking(models.Model):
    id = models.BigAutoField(primary_key=True)
    # user: required; RESTRICT → PROTECT in Django
    user_id = models.BigIntegerField(db_column='user_id')                               
    patient = models.ForeignKey('PatientRecord', on_delete=models.SET_NULL,
                                db_column='patient_id', related_name='bookings',
                                blank=True, null=True)                                  
    booking_type = models.CharField(max_length=16)                                      
    department = models.ForeignKey('Department', on_delete=models.SET_NULL,
                                   db_column='department_id', related_name='bookings',
                                   blank=True, null=True)                               
    doctor = models.ForeignKey('Doctor', on_delete=models.SET_NULL,
                               db_column='doctor_id', related_name='bookings',
                               blank=True, null=True)                                   
    slot_date = models.DateField()                                                      
    slot_time = models.TimeField()                                                      
    status = models.CharField(max_length=16)                                            
    notes = models.TextField(blank=True, null=True)                                    
    created_at = models.DateTimeField()                                                 

    class Meta:
        db_table = 'booking'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.booking_type} on {self.slot_date} at {self.slot_time}"

class AppUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=20,  null=True, blank=True)
    username = models.CharField(max_length=150, null=True, blank=True)
    password_hash = models.CharField(max_length=256, null=True, blank=True)
    role = models.CharField(max_length=16, null=True, blank=True)      # e.g. 'patient','guardian','staff'
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = "app_user"
        managed = False
        ordering = ["-id"]

    def __str__(self):
        return self.username or self.email or f"AppUser {self.id}"

class Complaint(models.Model):
    id = models.BigAutoField(primary_key=True)

    # REQUIRED in DB (NOT NULL)
    user = models.ForeignKey(
        'AppUser',
        on_delete=models.DO_NOTHING,
        db_column='user_id',
        related_name='complaints',
    )

    patient = models.ForeignKey(
        'PatientRecord',
        on_delete=models.CASCADE,
        db_column='patient_id',
        related_name='complaints',
    )

    admission = models.ForeignKey(
        'Admission',
        on_delete=models.SET_NULL,
        db_column='admission_id',
        related_name='complaints',
        null=True, blank=True,
    )

    ward = models.ForeignKey(
        'Ward',
        on_delete=models.SET_NULL,
        db_column='ward_id',
        related_name='complaints',
        null=True, blank=True,
    )

    bed = models.ForeignKey(
        'Bed',
        on_delete=models.SET_NULL,
        db_column='bed_id',
        related_name='complaints',
        null=True, blank=True,
    )

    category = models.CharField(max_length=64, db_column='category', null=True, blank=True)
    description = models.TextField(db_column='description')  # complaint text
    status = models.CharField(max_length=32, db_column='status', default='open')  # open|in_progress|resolved

    created_at = models.DateTimeField(db_column='created_at', null=True, blank=True)
    resolved_at = models.DateTimeField(db_column='resolved_at', null=True, blank=True)

    class Meta:
        db_table = 'complaint'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        who = getattr(self.patient, 'mrn', self.patient_id)
        return f"Complaint #{self.id} • {who} • {self.status}"



class Notification(models.Model):
    id = models.BigAutoField(primary_key=True)

    created_by = models.ForeignKey(
        'AppUser',                      
        on_delete=models.DO_NOTHING,
        db_column='created_by',         
        related_name='notifications_created'
    )

    target_user = models.ForeignKey(
        'AppUser',                      
        on_delete=models.CASCADE,
        db_column='target_user_id',     
        related_name='notifications',
        null=True, blank=True           
    )

    title = models.CharField(max_length=120)
    message = models.TextField()
    channels = models.CharField(max_length=32, default='in_app')  
    created_at = models.DateTimeField()
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification'   
        managed = False             
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title}"



class CanteenOrder(models.Model):
    id = models.BigAutoField(primary_key=True)

    user = models.ForeignKey(
        'AppUser',
        on_delete=models.DO_NOTHING,
        db_column='user_id',
        related_name='canteen_orders'
    )

    patient = models.ForeignKey(
        'PatientRecord',
        on_delete=models.SET_NULL,
        db_column='patient_id',
        related_name='canteen_orders',
        null=True, blank=True
    )

    status = models.CharField(max_length=16, default='pending')  
    total_cents = models.IntegerField()
    created_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'canteen_order'
        managed = False
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.id} – {self.status}"


class MenuItem(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=40, default='meal')
    price_cents = models.IntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'menu_item'
        managed = False
        ordering = ['name']

    def __str__(self):
        return self.name


class CanteenOrderItem(models.Model):
    id = models.BigAutoField(primary_key=True)

    order = models.ForeignKey(
        'CanteenOrder',
        on_delete=models.CASCADE,
        db_column='order_id',
        related_name='items'
    )

    menu_item = models.ForeignKey(
        'MenuItem',
        on_delete=models.DO_NOTHING,
        db_column='menu_item_id',
        related_name='order_items'
    )

    qty = models.IntegerField()
    price_cents = models.IntegerField()

    class Meta:
        db_table = 'canteen_order_item'
        managed = False

    def __str__(self):
        return f"{self.qty} × {self.menu_item_id} (₹{self.price_cents/100:.2f})"
    
class OtpCode(models.Model):
    id = models.BigAutoField(primary_key=True)
    destination = models.CharField(max_length=255)  # email or phone
    purpose = models.CharField(max_length=16)       # signup/login/reset
    code_hash = models.CharField(max_length=64)
    salt = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'otp_code'
        managed = False
        ordering = ['-expires_at']

    def __str__(self):
        return f"OTP for {self.destination} ({self.purpose})"


class PatientAccess(models.Model):
    id = models.BigAutoField(primary_key=True)

    # Guardian user who has access
    user = models.ForeignKey(
        'AppUser',
        on_delete=models.DO_NOTHING,
        db_column='user_id',
        related_name='patient_accesses'
    )

    # Which patient they can access
    patient = models.ForeignKey(
        'PatientRecord',
        on_delete=models.CASCADE,
        db_column='patient_id',
        related_name='accesses'
    )

    relationship = models.CharField(max_length=32, db_column='relationship', null=True, blank=True)  # e.g., guardian, parent

    class Meta:
        db_table = 'patient_access'
        managed = False
        unique_together = ('user', 'patient')  # one link per guardian/patient
        ordering = ['-id']

    def __str__(self):
        rel = getattr(self, "relationship", None)  # handle NULL safely
        return f"{self.user} → {self.patient}" if not rel else f"{self.user} → {self.patient} ({rel})"

class MedicalOrder(models.Model):
    id = models.BigAutoField(primary_key=True)

    admission = models.ForeignKey(
        'Admission',
        on_delete=models.DO_NOTHING,
        db_column='admission_id',
        related_name='medical_orders',
    )
    # creator: hospital staff user (from your app_user table)
    created_by = models.ForeignKey(
        'AppUser',
        on_delete=models.DO_NOTHING,
        db_column='created_by',
        related_name='created_orders',
    )

    order_type = models.CharField(max_length=32)   
    status     = models.CharField(max_length=16)   
    created_at = models.DateTimeField()
    payload_json = models.JSONField(db_column='payload_json', null=True, blank=True)

    class Meta:
        db_table = 'medical_order'
        managed  = False
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_type} ({self.status}) for admission {self.admission_id}"
    
