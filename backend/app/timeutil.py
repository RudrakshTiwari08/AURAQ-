from datetime import datetime, timedelta, timezone

LOCAL_TZ = timezone(timedelta(hours=5, minutes=30))   # India (IST)


def aware(dt: datetime) -> datetime:
    """SQLite gives back naive datetimes; ours are always UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def local(dt: datetime) -> datetime:
    return aware(dt).astimezone(LOCAL_TZ)


def fmt_clock(dt: datetime) -> str:
    return local(dt).strftime("%I:%M %p")


def fmt_datetime(dt: datetime) -> str:
    return local(dt).strftime("%Y-%m-%d %H:%M")
