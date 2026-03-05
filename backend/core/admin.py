from django.contrib import admin
from .models import Student, Visitor, StudentVisitorRelationship, VisitRecord, AuditLog


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'full_name', 'class_level', 'enrollment_status')
    search_fields = ('student_id', 'full_name')


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'created_at')
    search_fields = ('full_name', 'phone')


@admin.register(StudentVisitorRelationship)
class StudentVisitorRelationshipAdmin(admin.ModelAdmin):
    list_display = ('student', 'visitor', 'relationship_type')
    list_filter = ('relationship_type',)


@admin.register(VisitRecord)
class VisitRecordAdmin(admin.ModelAdmin):
    list_display = ('visitor', 'student', 'visit_date', 'check_in_time', 'check_out_time', 'receptionist')
    list_filter = ('visit_date', 'relationship_type')
    date_hierarchy = 'visit_date'


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'model_name', 'object_id')
    list_filter = ('action', 'model_name')
    date_hierarchy = 'timestamp'
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'message', 'changes', 'timestamp', 'ip_address')
