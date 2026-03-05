from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('students', views.StudentViewSet, basename='student')
router.register('visitors', views.VisitorViewSet, basename='visitor')
router.register('student-visitor-relationships', views.StudentVisitorRelationshipViewSet, basename='studentvisitorrelationship')
router.register('visit-records', views.VisitRecordViewSet, basename='visitrecord')
router.register('reports', views.ReportViewSet, basename='report')
router.register('audit-logs', views.AuditLogViewSet, basename='auditlog')
router.register('users', views.UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
