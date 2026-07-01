import base64
import os
from app.config import get_settings

settings = get_settings()


def _get_local_key() -> bytes:
    """Derive a 32-byte key from LOCAL_ENCRYPTION_KEY env var, or generate a stable one."""
    raw = os.environ.get("LOCAL_ENCRYPTION_KEY", "")
    if not raw:
        # Fallback — deterministic but weak. Set LOCAL_ENCRYPTION_KEY in .env for production.
        raw = "orch-local-dev-key-not-for-production"
    import hashlib
    return hashlib.sha256(raw.encode()).digest()


def encrypt_key(plaintext: str) -> str:
    if settings.kms_key_id:
        return _kms_encrypt(plaintext)
    return _local_encrypt(plaintext)


def decrypt_key(stored: str) -> str:
    if stored.startswith("kms:"):
        return _kms_decrypt(stored[4:])
    return _local_decrypt(stored)


def _local_encrypt(plaintext: str) -> str:
    from cryptography.fernet import Fernet
    key = base64.urlsafe_b64encode(_get_local_key())
    return "local:" + Fernet(key).encrypt(plaintext.encode()).decode()


def _local_decrypt(stored: str) -> str:
    from cryptography.fernet import Fernet
    value = stored[6:] if stored.startswith("local:") else stored
    # Legacy base64-only fallback for keys stored before this fix
    try:
        key = base64.urlsafe_b64encode(_get_local_key())
        return Fernet(key).decrypt(value.encode()).decode()
    except Exception:
        # Legacy plain base64 — migrate on next save
        return base64.b64decode(value).decode()


def _kms_encrypt(plaintext: str) -> str:
    import boto3
    from cryptography.fernet import Fernet
    kms = boto3.client("kms", region_name=settings.aws_region)
    response = kms.generate_data_key(KeyId=settings.kms_key_id, KeySpec="AES_256")
    data_key = response["Plaintext"]
    data_key_encrypted = base64.b64encode(response["CiphertextBlob"]).decode()
    f = Fernet(base64.urlsafe_b64encode(data_key[:32]))
    encrypted = f.encrypt(plaintext.encode()).decode()
    return f"kms:{data_key_encrypted}:{encrypted}"


def _kms_decrypt(stored: str) -> str:
    import boto3
    from cryptography.fernet import Fernet
    kms = boto3.client("kms", region_name=settings.aws_region)
    data_key_encrypted_b64, encrypted_key = stored.split(":", 1)
    response = kms.decrypt(CiphertextBlob=base64.b64decode(data_key_encrypted_b64))
    data_key = response["Plaintext"]
    f = Fernet(base64.urlsafe_b64encode(data_key[:32]))
    return f.decrypt(encrypted_key.encode()).decode()
