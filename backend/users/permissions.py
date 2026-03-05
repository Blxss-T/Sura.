from rest_framework import permissions


class HasRole(permissions.BasePermission):
    """Allow access only if user has one of the given roles."""
    role_list = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'role'):
            return False
        return request.user.role in self.role_list


class IsAdmin(HasRole):
    role_list = ['ADMIN']


class IsReceptionist(HasRole):
    role_list = ['ADMIN', 'RECEPTIONIST']


class IsSecurity(HasRole):
    role_list = ['ADMIN', 'SECURITY']


class IsAdminOrReceptionist(HasRole):
    role_list = ['ADMIN', 'RECEPTIONIST']


class IsAdminOrSecurity(HasRole):
    role_list = ['ADMIN', 'SECURITY']
