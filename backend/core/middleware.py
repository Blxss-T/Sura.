"""
Store current request in thread-local for audit logging.
"""
import threading

_request = threading.local()


def get_current_request():
    return getattr(_request, 'request', None)


def set_current_request(request):
    _request.request = request


def clear_request():
    if hasattr(_request, 'request'):
        del _request.request


class AuditRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        set_current_request(request)
        try:
            return self.get_response(request)
        finally:
            clear_request()
