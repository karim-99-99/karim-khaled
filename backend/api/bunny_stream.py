"""Bunny Stream HTTP API — create video + upload file (stdlib only)."""
import json
import urllib.error
import urllib.request
from urllib.parse import quote


class BunnyStreamError(Exception):
    pass


def bunny_create_video(library_id: int, access_key: str, title: str) -> str:
    t = (title or "").strip() or "Video"
    url = f"https://video.bunnycdn.com/library/{int(library_id)}/videos"
    body = json.dumps({"title": t}).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("AccessKey", access_key)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise BunnyStreamError(f"Create video HTTP {e.code}: {err_body}") from e
    except urllib.error.URLError as e:
        raise BunnyStreamError(f"Network error: {e}") from e
    data = json.loads(raw)
    guid = data.get("guid")
    if not guid:
        raise BunnyStreamError(f"Unexpected Bunny response: {raw[:500]}")
    return guid


def bunny_upload_video(library_id: int, access_key: str, video_guid: str, file_bytes: bytes) -> None:
    safe_guid = quote(str(video_guid), safe="")
    url = f"https://video.bunnycdn.com/library/{int(library_id)}/videos/{safe_guid}"
    req = urllib.request.Request(url, data=file_bytes, method="PUT")
    req.add_header("AccessKey", access_key)
    req.add_header("Content-Type", "application/octet-stream")
    try:
        with urllib.request.urlopen(req, timeout=900) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise BunnyStreamError(f"Upload HTTP {e.code}: {err_body}") from e
    except urllib.error.URLError as e:
        raise BunnyStreamError(f"Network error during upload: {e}") from e


def bunny_create_and_upload(library_id: int, access_key: str, title: str, file_bytes: bytes) -> str:
    if not file_bytes:
        raise BunnyStreamError("Empty file")
    guid = bunny_create_video(library_id, access_key, title)
    bunny_upload_video(library_id, access_key, guid, file_bytes)
    return guid
