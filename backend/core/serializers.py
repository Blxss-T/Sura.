from rest_framework import serializers
from .models import Student, Visitor, StudentVisitorRelationship, VisitRecord, AuditLog
from .national_id_utils import normalize_national_id
from django.contrib.auth import get_user_model
User = get_user_model()


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'username', 'action', 'model_name', 'object_id', 'message', 'changes', 'timestamp', 'ip_address')


class StudentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ('id', 'student_id', 'full_name', 'class_level', 'enrollment_status', 'created_at', 'updated_at')


class StudentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class VisitorSerializer(serializers.ModelSerializer):
    national_id_masked = serializers.SerializerMethodField()

    class Meta:
        model = Visitor
        fields = ('id', 'full_name', 'national_id_masked', 'phone', 'created_at', 'updated_at')
        read_only_fields = ('national_id_masked',)

    def get_national_id_masked(self, obj):
        return obj.get_national_id_masked()


class VisitorCreateUpdateSerializer(serializers.ModelSerializer):
    national_id = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Visitor
        fields = ('id', 'full_name', 'national_id', 'phone', 'created_at', 'updated_at')

    def create(self, validated_data):
        national_id = validated_data.pop('national_id', '') or ''
        normalized = normalize_national_id(national_id)
        if normalized:
            existing = Visitor.objects.filter(national_id_normalized=normalized).first()
            if existing:
                return existing
        obj = Visitor.objects.create(**validated_data)
        if national_id:
            obj.set_national_id(national_id)
            obj.save(update_fields=['national_id_encrypted', 'national_id_normalized'])
        return obj

    def update(self, instance, validated_data):
        national_id = validated_data.pop('national_id', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if national_id is not None:
            instance.set_national_id(national_id)
        instance.save()
        return instance


class StudentVisitorRelationshipSerializer(serializers.ModelSerializer):
    visitor = VisitorSerializer(read_only=True)
    visitor_id = serializers.PrimaryKeyRelatedField(queryset=Visitor.objects.all(), write_only=True, required=False)

    class Meta:
        model = StudentVisitorRelationship
        fields = ('id', 'student', 'visitor', 'visitor_id', 'relationship_type', 'created_at')
        read_only_fields = ('student', 'visitor')

    def create(self, validated_data):
        visitor_id = validated_data.pop('visitor_id', None)
        if visitor_id:
            validated_data['visitor'] = visitor_id
        return super().create(validated_data)


class VisitRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    visitor_name = serializers.CharField(source='visitor.full_name', read_only=True)
    receptionist_name = serializers.SerializerMethodField()

    class Meta:
        model = VisitRecord
        fields = (
            'id', 'student', 'student_name', 'visitor', 'visitor_name',
            'relationship_type', 'check_in_time', 'check_out_time',
            'receptionist', 'receptionist_name', 'visit_date', 'created_at', 'updated_at'
        )
        read_only_fields = ('check_in_time', 'receptionist', 'visit_date')

    def get_receptionist_name(self, obj):
        return obj.receptionist.get_username() if obj.receptionist else None


class VisitRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitRecord
        fields = ('id', 'student', 'visitor', 'relationship_type', 'check_in_time', 'check_out_time', 'receptionist', 'visit_date')

    def create(self, validated_data):
        from django.utils import timezone
        validated_data.setdefault('check_in_time', timezone.now())
        validated_data.setdefault('visit_date', timezone.now().date())
        validated_data['receptionist'] = self.context['request'].user
        return super().create(validated_data)


class VisitRecordCheckOutSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitRecord
        fields = ('check_out_time',)
