
from core.views import SlotsView
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import DepartmentViewSet, DoctorViewSet, BookingViewSet, AdmissionViewSet, AdmissionTaskViewSet, ReportViewSet, ComplaintViewSet, NotificationViewSet, MenuItemViewSet, CanteenOrderViewSet, CanteenOrderItemViewSet, PatientRecordViewSet, PatientAccessViewSet, OtpSendView, OtpVerifyView, SignupView, LoginView, LogoutView, MeView, MedicalOrderViewSet, AppUserViewSet, WardViewSet, BedViewSet, AppUserSignupView, AppUserLoginView, AppUserMeView, AppUserPasswordLoginView, AppUserSignupVerifyView # NEW

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'admissions', AdmissionViewSet, basename='admission')              # NEW
router.register(r'admission-tasks', AdmissionTaskViewSet, basename='admissiontask') # NEW
router.register(r'reports', ReportViewSet, basename='report')   # <-- new
router.register(r'complaints', ComplaintViewSet, basename='complaint')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'menu', MenuItemViewSet, basename='menu')
router.register(r'canteen-orders', CanteenOrderViewSet, basename='canteenorder')
router.register(r'canteen-order-items', CanteenOrderItemViewSet, basename='canteenorderitem')
router.register(r'patients', PatientRecordViewSet, basename='patient')
router.register(r'patient-access', PatientAccessViewSet, basename='patientaccess')
router.register(r'orders', MedicalOrderViewSet, basename='medical-order')
router.register(r'appusers', AppUserViewSet, basename='appuser')
router.register(r'wards', WardViewSet, basename='ward')
router.register(r'beds', BedViewSet, basename='bed')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/otp/send/', OtpSendView.as_view(), name='otp-send'),
    path('api/otp/verify/', OtpVerifyView.as_view(), name='otp-verify'),
    path('api/auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('api/auth/login/',  LoginView.as_view(),  name='auth-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/',     MeView.as_view(),     name='auth-me'),
    path('api/slots/', SlotsView.as_view(), name='slots'),
    path('api/app/auth/signup/', AppUserSignupView.as_view(), name='appuser-signup'),
    path('api/app/auth/login/',  AppUserLoginView.as_view(),  name='appuser-login'),
    path('api/app/auth/me/',     AppUserMeView.as_view(),     name='appuser-me'),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/app/auth/login-password/', AppUserPasswordLoginView.as_view(), name='appuser-login-password'),
    path('api/app/auth/signup-verify/', AppUserSignupVerifyView.as_view(), name='appuser-signup-verify'),
]
