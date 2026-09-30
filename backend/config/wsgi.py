"""
WSGI config for educational platform backend.
"""

import os
import threading
import time

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()


def _hour_in_keepalive_window(hour: int, start: int, end: int) -> bool:
    """
    True if local `hour` is in [start, end) on a 24h clock.
    If start > end the window wraps past midnight (e.g. 9 → 1).
    """
    if start == end:
        return True  # 24h window
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end


def _neon_keepalive_loop():
    """
    Keep Neon awake during the study window (Asia/Riyadh).

    Default: 09:00 → 01:00 (next day). Sleep 01:00 → 09:00 so Neon Free
    can autosuspend overnight.

    Override with NEON_KEEPALIVE_START_HOUR / NEON_KEEPALIVE_END_HOUR
    (local hour, end exclusive). Set NEON_KEEPALIVE_DISABLED=1 to turn off.
    """
    time.sleep(20)
    while True:
        try:
            if os.environ.get("NEON_KEEPALIVE_DISABLED", "").strip() in (
                "1",
                "true",
                "yes",
            ):
                time.sleep(300)
                continue

            from django.utils import timezone
            from django.db import connection

            start = int(os.environ.get("NEON_KEEPALIVE_START_HOUR", "9"))
            end = int(os.environ.get("NEON_KEEPALIVE_END_HOUR", "1"))
            hour = timezone.localtime().hour
            if _hour_in_keepalive_window(hour, start, end):
                connection.close_if_unusable_or_obsolete()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    cursor.fetchone()
        except Exception:
            pass
        # Neon Free typically suspends after ~5 min idle; ping under that.
        time.sleep(240)


if os.environ.get("RENDER", "").lower() == "true":
    threading.Thread(
        target=_neon_keepalive_loop,
        name="neon-keepalive",
        daemon=True,
    ).start()
