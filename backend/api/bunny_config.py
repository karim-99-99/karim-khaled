"""
Resolve Bunny Stream credentials from env vars and admin-registered libraries (database).
"""
import os
import re

from django.conf import settings as django_settings

_BUNNY_LIB_SEC_KEY_RE = re.compile(r"^BUNNY_SECURITY_KEY_(\d+)$")
_BUNNY_LIB_API_KEY_RE = re.compile(r"^BUNNY_STREAM_API_KEY_(\d+)$")


def _merge_bunny_library_entry(configs, lib, *, is_default=False, security_key="", stream_api_key=""):
    """Merge Bunny keys for one library into configs[lib]."""
    lib = str(lib or "").strip()
    if not lib:
        return
    sec = str(security_key or "").strip()
    api = str(stream_api_key or "").strip()
    if not sec:
        sec = os.environ.get(f"BUNNY_SECURITY_KEY_{lib}", "").strip()
    if not api:
        api = os.environ.get(f"BUNNY_STREAM_API_KEY_{lib}", "").strip()

    entry = configs.get(lib, {"library_id": lib, "is_default": is_default})
    if sec:
        entry["security_key"] = sec
    entry.setdefault("security_key", "")
    if api:
        entry["stream_api_key"] = api
    entry.setdefault("stream_api_key", "")
    entry["is_default"] = bool(entry.get("is_default")) or is_default
    configs[lib] = entry


def _discover_bunny_library_ids_from_env():
    discovered = set()
    for env_key in os.environ:
        m = _BUNNY_LIB_SEC_KEY_RE.match(env_key)
        if m:
            discovered.add(m.group(1))
            continue
        m = _BUNNY_LIB_API_KEY_RE.match(env_key)
        if m:
            discovered.add(m.group(1))
    return discovered


def _load_libraries_from_database(configs):
    """Admin-registered libraries (website UI) override env for the same library id."""
    try:
        from .models import BunnyStreamLibrary
    except Exception:
        return

    for row in BunnyStreamLibrary.objects.filter(is_active=True):
        lib = str(row.library_id or "").strip()
        if not lib:
            continue
        _merge_bunny_library_entry(
            configs,
            lib,
            security_key=row.security_key,
            stream_api_key=row.stream_api_key,
        )
        configs[lib]["source"] = "database"
        if row.label:
            configs[lib]["label"] = row.label


def get_bunny_library_configs():
    """
    Build per-library Bunny config map from:
    1) Django settings / env (optional default + per-library env vars)
    2) BunnyStreamLibrary rows saved by admin in the website
    """
    configs = {}

    default_library = str(getattr(django_settings, "BUNNY_LIBRARY_ID", "") or "").strip()
    default_security = str(getattr(django_settings, "BUNNY_SECURITY_KEY", "") or "").strip()
    default_api = str(getattr(django_settings, "BUNNY_STREAM_API_KEY", "") or "").strip()
    if default_library:
        configs[default_library] = {
            "library_id": default_library,
            "security_key": default_security,
            "stream_api_key": default_api,
            "is_default": True,
            "source": "env",
        }

    additional = os.environ.get("BUNNY_ADDITIONAL_LIBRARY_IDS", "")
    for raw_lib in (additional or "").split(","):
        _merge_bunny_library_entry(configs, str(raw_lib or "").strip())

    for lib in _discover_bunny_library_ids_from_env():
        _merge_bunny_library_entry(configs, lib)
        if lib in configs:
            configs[lib].setdefault("source", "env")

    _load_libraries_from_database(configs)
    return configs


def get_bunny_config_for_library(library_id):
    """Return signing/upload config for a library id (env or database)."""
    lib = str(library_id or "").strip()
    if not lib:
        return None
    configs = get_bunny_library_configs()
    if lib in configs:
        return configs[lib]
    _merge_bunny_library_entry(configs, lib)
    return configs.get(lib)
