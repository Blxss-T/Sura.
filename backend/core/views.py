from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import FilterSet, CharFilter
from django.db.models import Q, Count
from django.http import HttpResponse
import csv
import io

from users.permissions import IsAdmin, IsReceptionist, IsSecurity, IsAdminOrReceptionist, IsAdminOrSecurity
from users.serializers import UserSerializer
from .models import Student, Visitor, StudentVisitorRelationship, VisitRecord, AuditLog
from .serializers import (
    StudentListSerializer, StudentDetailSerializer,
    VisitorSerializer, VisitorCreateUpdateSerializer,
    StudentVisitorRelationshipSerializer,
    VisitRecordSerializer, VisitRecordCreateSerializer, VisitRecordCheckOutSerializer,
    AuditLogSerializer,
)
from django.contrib.auth import get_user_model

User = get_user_model()


# ---------- Student ----------
class StudentFilter(FilterSet):
    search = CharFilter(method='filter_search')
    enrollment_status = CharFilter(field_name='enrollment_status')

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(full_name__icontains=value) | Q(student_id__icontains=value)
        )


class StudentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReceptionist]
    filter_backends = [DjangoFilterBackend]
    filterset_class = StudentFilter

    def get_queryset(self):
        return Student.objects.all()

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return StudentListSerializer
        return StudentDetailSerializer

    @action(detail=True, methods=['get'])
    def visitors(self, request, pk=None):
        student = self.get_object()
        rels = StudentVisitorRelationship.objects.filter(student=student).select_related('visitor')
        serializer = StudentVisitorRelationshipSerializer(rels, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def bulk_upload(self, request):
        if not request.user.role == 'ADMIN':
            return Response({'detail': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.endswith('.csv'):
            return Response({'detail': 'CSV file required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            content = file.read().decode('utf-8-sig')
        except Exception:
            content = file.read().decode('latin-1')
        reader = csv.DictReader(io.StringIO(content))
        created_students = 0
        created_visitors = 0
        linked = 0
        errors = []
        for i, row in enumerate(reader, start=2):
            student_id = (row.get('student_id') or row.get('student id') or '').strip()
            full_name = (row.get('full_name') or row.get('full name') or '').strip()
            class_level = (row.get('class_level') or row.get('class') or '').strip()
            enrollment_status = (row.get('enrollment_status') or row.get('status') or 'ACTIVE').strip().upper()
            if enrollment_status not in ('ACTIVE', 'INACTIVE'):
                enrollment_status = 'ACTIVE'
            visitor_name = (row.get('visitor_name') or row.get('visitor name') or '').strip()
            national_id = (row.get('national_id') or row.get('national id') or '').strip()
            phone = (row.get('phone') or '').strip()
            relationship_type = (row.get('relationship_type') or row.get('relationship') or 'OTHER').strip().upper()
            if relationship_type not in dict(StudentVisitorRelationship.RelationshipType.choices):
                relationship_type = 'OTHER'
            if not student_id or not full_name:
                errors.append({'row': i, 'message': 'student_id and full_name required'})
                continue
            try:
                student, s_created = Student.objects.get_or_create(
                    student_id=student_id,
                    defaults={'full_name': full_name, 'class_level': class_level, 'enrollment_status': enrollment_status}
                )
                if s_created:
                    created_students += 1
                else:
                    student.full_name = full_name
                    student.class_level = class_level
                    student.enrollment_status = enrollment_status
                    student.save()
                if visitor_name or national_id:
                    from core.national_id_utils import normalize_national_id, encrypt_national_id
                    norm = normalize_national_id(national_id) if national_id else None
                    visitor = None
                    if norm:
                        visitor = Visitor.objects.filter(national_id_normalized=norm).first()
                    if not visitor:
                        visitor = Visitor.objects.create(full_name=visitor_name or 'Unknown', phone=phone)
                        if national_id:
                            visitor.set_national_id(national_id)
                            visitor.save(update_fields=['national_id_encrypted', 'national_id_normalized'])
                        created_visitors += 1
                    else:
                        visitor.full_name = visitor_name or visitor.full_name
                        visitor.phone = phone or visitor.phone
                        visitor.save()
                    _, rel_created = StudentVisitorRelationship.objects.get_or_create(
                        student=student, visitor=visitor,
                        defaults={'relationship_type': relationship_type}
                    )
                    if rel_created:
                        linked += 1
            except Exception as e:
                errors.append({'row': i, 'message': str(e)})
        return Response({
            'created_students': created_students,
            'created_visitors': created_visitors,
            'linked': linked,
            'errors': errors,
        }, status=status.HTTP_200_OK)


# ---------- Visitor ----------
class VisitorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReceptionist]
    queryset = Visitor.objects.all()

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return VisitorSerializer
        return VisitorCreateUpdateSerializer


# ---------- StudentVisitorRelationship ----------
class StudentVisitorRelationshipViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrReceptionist]
    queryset = StudentVisitorRelationship.objects.all()
    serializer_class = StudentVisitorRelationshipSerializer


# ---------- VisitRecord ----------
class VisitRecordViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ('currently_checked_in', 'overstayed', 'check_out'):
            return [IsAdminOrSecurity()]
        return [IsAdminOrReceptionist()]

    queryset = VisitRecord.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return VisitRecordCreateSerializer
        if self.action in ('partial_update', 'update') and 'check_out_time' in (self.request.data or {}):
            return VisitRecordCheckOutSerializer
        return VisitRecordSerializer

    def get_queryset(self):
        qs = VisitRecord.objects.select_related('student', 'visitor', 'receptionist')
        return qs

    def create(self, request, *args, **kwargs):
        serializer = VisitRecordCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(VisitRecordSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def currently_checked_in(self, request):
        qs = self.get_queryset().filter(check_out_time__isnull=True)
        serializer = VisitRecordSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overstayed(self, request):
        from datetime import timedelta
        threshold_hours = int(request.query_params.get('hours', 2))
        cutoff = timezone.now() - timedelta(hours=threshold_hours)
        qs = self.get_queryset().filter(check_out_time__isnull=True, check_in_time__lt=cutoff)
        serializer = VisitRecordSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def check_out(self, request, pk=None):
        record = self.get_object()
        if record.check_out_time:
            return Response({'detail': 'Already checked out'}, status=status.HTTP_400_BAD_REQUEST)
        record.check_out_time = timezone.now()
        record.save(update_fields=['check_out_time', 'updated_at'])
        return Response(VisitRecordSerializer(record).data)


# ---------- Reports ----------
class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrReceptionist]

    def _daily_summary(self, request):
        date_str = request.query_params.get('date') or timezone.now().date().isoformat()
        try:
            from datetime import datetime
            d = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            d = timezone.now().date()
        count = VisitRecord.objects.filter(visit_date=d).count()
        checked_in = VisitRecord.objects.filter(visit_date=d, check_out_time__isnull=True).count()
        return Response({'date': str(d), 'total_visits': count, 'currently_checked_in': checked_in})

    def _term_report(self, request):
        start = request.query_params.get('start') or (timezone.now().date().isoformat())
        end = request.query_params.get('end') or (timezone.now().date().isoformat())
        from datetime import datetime
        try:
            start_d = datetime.strptime(start, '%Y-%m-%d').date()
            end_d = datetime.strptime(end, '%Y-%m-%d').date()
        except ValueError:
            start_d = end_d = timezone.now().date()
        qs = VisitRecord.objects.filter(visit_date__gte=start_d, visit_date__lte=end_d)
        total = qs.count()
        by_date = list(qs.values('visit_date').annotate(count=Count('id')).order_by('visit_date'))
        return Response({'start': str(start_d), 'end': str(end_d), 'total_visits': total, 'by_date': by_date})

    def _most_visited_students(self, request):
        from datetime import datetime
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        qs = VisitRecord.objects.all()
        if start:
            try:
                start_d = datetime.strptime(start, '%Y-%m-%d').date()
                qs = qs.filter(visit_date__gte=start_d)
            except ValueError:
                pass
        if end:
            try:
                end_d = datetime.strptime(end, '%Y-%m-%d').date()
                qs = qs.filter(visit_date__lte=end_d)
            except ValueError:
                pass
        qs = qs.values('student').annotate(count=Count('id')).order_by('-count')[:20]
        student_ids = [x['student'] for x in qs]
        students = {s.id: s for s in Student.objects.filter(id__in=student_ids)}
        result = []
        for row in qs:
            s = students.get(row['student'])
            result.append({'student_id': s.student_id if s else None, 'student_name': s.full_name if s else None, 'visit_count': row['count']})
        return Response(result)

    def list(self, request):
        report = request.query_params.get('report')
        if report == 'daily':
            return self._daily_summary(request)
        if report == 'term':
            return self._term_report(request)
        if report == 'most_visited':
            return self._most_visited_students(request)
        return Response({'detail': 'Specify report=daily|term|most_visited'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export(self, request):
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        qs = VisitRecord.objects.select_related('student', 'visitor', 'receptionist').all()
        if start:
            try:
                from datetime import datetime
                start_d = datetime.strptime(start, '%Y-%m-%d').date()
                qs = qs.filter(visit_date__gte=start_d)
            except ValueError:
                pass
        if end:
            try:
                from datetime import datetime
                end_d = datetime.strptime(end, '%Y-%m-%d').date()
                qs = qs.filter(visit_date__lte=end_d)
            except ValueError:
                pass
        qs = qs.order_by('-visit_date', '-check_in_time')[:5000]
        output = io.StringIO()
        w = csv.writer(output)
        w.writerow(['Visit Date', 'Student ID', 'Student Name', 'Visitor Name', 'Relationship', 'Check In', 'Check Out', 'Receptionist'])
        for r in qs:
            w.writerow([
                r.visit_date, r.student.student_id, r.student.full_name,
                r.visitor.full_name, r.get_relationship_type_display(),
                r.check_in_time, r.check_out_time or '', r.receptionist.get_username() if r.receptionist else ''
            ])
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="visits_export.csv"'
        response.write(output.getvalue())
        return response


# ---------- Audit logs (Admin only) ----------
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAdmin]
    queryset = AuditLog.objects.select_related('user').order_by('-timestamp')
    filterset_fields = ['model_name', 'action', 'user']
    serializer_class = AuditLogSerializer


# ---------- User management (Admin only) ----------
class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    serializer_class = UserSerializer
