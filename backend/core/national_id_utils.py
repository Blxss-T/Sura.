"""
Encrypt/decrypt and mask national ID for secure storage and display.
"""
import base64
import hashlib
from django.conf import settings


def _get_fernet():
    from cryptography.fernet import Fernet
    key = getattr(settings, 'NATIONAL_ID_ENCRYPTION_KEY', None) or ''
    if not key:
        # Dev fallback: deterministic from SECRET_KEY (not for production)
        raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(raw).decode()
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_national_id(plain: str) -> str:
    if not plain:
        return ''
    f = _get_fernet()
    return base64.urlsafe_b64encode(f.encrypt(plain.strip().encode())).decode()


def decrypt_national_id(encrypted: str) -> str:
    if not encrypted:
        return ''
    try:
        f = _get_fernet()
        return f.decrypt(base64.urlsafe_b64decode(encrypted)).decode()
    except Exception:
        return ''


def mask_national_id(plain_or_encrypted: str, encrypted: bool = False) -> str:
    """Return masked value for display, e.g. ***1234."""
    if not plain_or_encrypted:
        return ''
    if encrypted:
        plain_or_encrypted = decrypt_national_id(plain_or_encrypted)
    s = (plain_or_encrypted or '').strip()
    if len(s) <= 4:
        return '*' * len(s)
    return '*' * (len(s) - 4) + s[-4:]


def normalize_national_id(plain: str) -> str:
    """Normalize for duplicate check (digits only)."""
    if not plain:
        return ''
    return ''.join(c for c in str(plain).strip() if c.isdigit())
