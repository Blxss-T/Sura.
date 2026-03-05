from django.db import models
from django.conf import settings
from core.national_id_utils import encrypt_national_id, mask_national_id, normalize_national_id


class Student(models.Model):
    class EnrollmentStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'

    student_id = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=255, db_index=True)
    class_level = models.CharField(max_length=50, blank=True)
    enrollment_status = models.CharField(
        max_length=20, choices=EnrollmentStatus.choices, default=EnrollmentStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_students'
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['full_name']),
            models.Index(fields=['enrollment_status']),
        ]

    def __str__(self):
        return f"{self.student_id} - {self.full_name}"


class Visitor(models.Model):
    full_name = models.CharField(max_length=255, db_index=True)
    national_id_encrypted = models.TextField(blank=True)  # encrypted storage
    national_id_normalized = models.CharField(max_length=50, blank=True, db_index=True)  # for duplicate lookup
    phone = models.CharField(max_length=30, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_visitors'
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['full_name']),
            models.Index(fields=['national_id_normalized']),
        ]

    def __str__(self):
        return self.full_name

    def set_national_id(self, plain: str):
        self.national_id_normalized = normalize_national_id(plain)
        self.national_id_encrypted = encrypt_national_id(plain) if plain else ''

    def get_national_id_masked(self):
        from core.national_id_utils import decrypt_national_id
        if not self.national_id_encrypted:
            return ''
        from core.national_id_utils import mask_national_id
        return mask_national_id(self.national_id_encrypted, encrypted=True)


class StudentVisitorRelationship(models.Model):
    class RelationshipType(models.TextChoices):
        MOTHER = 'MOTHER', 'Mother'
        FATHER = 'FATHER', 'Father'
        GUARDIAN = 'GUARDIAN', 'Guardian'
        UNCLE = 'UNCLE', 'Uncle'
        AUNT = 'AUNT', 'Aunt'
        OTHER = 'OTHER', 'Other'

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='visitor_relationships')
    visitor = models.ForeignKey(Visitor, on_delete=models.CASCADE, related_name='student_relationships')
    relationship_type = models.CharField(max_length=20, choices=RelationshipType.choices, default=RelationshipType.OTHER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_student_visitor_relationships'
        constraints = [
            models.UniqueConstraint(fields=['student', 'visitor'], name='unique_student_visitor'),
        ]
        ordering = ['student', 'visitor']

    def __str__(self):
        return f"{self.student} - {self.visitor} ({self.get_relationship_type_display()})"


class VisitRecord(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='visit_records')
    visitor = models.ForeignKey(Visitor, on_delete=models.CASCADE, related_name='visit_records')
    relationship_type = models.CharField(
        max_length=20,
        choices=StudentVisitorRelationship.RelationshipType.choices,
        default=StudentVisitorRelationship.RelationshipType.OTHER,
    )
    check_in_time = models.DateTimeField()
    check_out_time = models.DateTimeField(null=True, blank=True, db_index=True)
    receptionist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='processed_visits'
    )
    visit_date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_visit_records'
        ordering = ['-check_in_time']
        indexes = [
            models.Index(fields=['visit_date']),
            models.Index(fields=['check_out_time']),
        ]

    def __str__(self):
        return f"{self.visitor} @ {self.student} on {self.visit_date}"


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    message = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'core_audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['user_id']),
        ]
