from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a default admin user if none exists (username: admin, password: admin - change in production)'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin', help='Username')
        parser.add_argument('--password', default='admin', help='Password')

    def handle(self, *args, **options):
        if User.objects.filter(role=User.Role.ADMIN).exists():
            self.stdout.write('An admin user already exists.')
            return
        user = User.objects.create_superuser(
            username=options['username'],
            password=options['password'],
            email='admin@school.local',
        )
        user.role = User.Role.ADMIN
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Admin user "{user.username}" created.'))
