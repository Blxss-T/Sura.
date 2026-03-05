"""
Audit logging via Django signals.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from core.models import AuditLog, Student, Visitor, VisitRecord, StudentVisitorRelationship

User = get_user_model()


def _get_current_user():
    from core.middleware import get_current_request
    req = get_current_request()
    return req.user if req and getattr(req, 'user', None) and req.user.is_authenticated else None


def _log(action, model_name, instance, message='', changes=None):
    user = _get_current_user()
    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=str(instance.pk) if instance.pk else '',
        message=message or f'{action} {model_name}',
        changes=changes or {},
    )


@receiver(post_save)
def model_saved(sender, instance, created, **kwargs):
    if sender not in (Student, Visitor, VisitRecord, StudentVisitorRelationship, User):
        return
    if sender == User and not hasattr(instance, 'role'):
        return
    action = AuditLog.Action.CREATE if created else AuditLog.Action.UPDATE
    name = f'{sender.__module__}.{sender.__name__}'
    _log(action, name, instance)


@receiver(post_delete)
def model_deleted(sender, instance, **kwargs):
    if sender not in (Student, Visitor, VisitRecord, StudentVisitorRelationship):
        return
    name = f'{sender.__module__}.{sender.__name__}'
    _log(AuditLog.Action.DELETE, name, instance, message=f'Deleted {name} pk={instance.pk}')
