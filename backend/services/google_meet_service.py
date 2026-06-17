import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from config import get_settings

settings = get_settings()

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    _GOOGLE_LIBS_AVAILABLE = True
except ImportError:
    _GOOGLE_LIBS_AVAILABLE = False


SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_service(delegate_email: Optional[str] = None):
    if not _GOOGLE_LIBS_AVAILABLE:
        raise RuntimeError(
            "Las librerías de Google no están instaladas. "
            "Ejecuta: pip install google-api-python-client google-auth"
        )

    sa_path = getattr(settings, "GOOGLE_SERVICE_ACCOUNT_JSON", None)
    if not sa_path or not os.path.exists(sa_path):
        raise FileNotFoundError(
            f"No se encontró el archivo de Service Account en: {sa_path}. "
            "Configura GOOGLE_SERVICE_ACCOUNT_JSON en tu .env"
        )

    credentials = service_account.Credentials.from_service_account_file(
        sa_path, scopes=SCOPES
    )
    if delegate_email:
        credentials = credentials.with_subject(delegate_email)

    return build("calendar", "v3", credentials=credentials)


def create_meet_event(
    summary: str,
    start_dt: datetime,
    duration_minutes: int = 60,
    description: str = "",
    attendees: Optional[list[str]] = None,
    delegate_email: Optional[str] = None,
) -> dict:
    try:
        service = _get_service(delegate_email)
    except Exception:
        try:
            service = _get_service(None)
        except Exception:
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(minutes=duration_minutes)
            room_hash = f"rce-upt-{int(start_dt.timestamp())}"
            return {
                "event_id": f"local-{int(start_dt.timestamp())}",
                "meet_link": f"https://meet.jit.si/{room_hash}",
                "html_link": "",
                "start": start_dt.isoformat(),
                "end": end_dt.isoformat(),
            }
        delegate_email = None

    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    end_dt = start_dt + timedelta(minutes=duration_minutes)

    event_body = {
        "summary": summary,
        "description": description,
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": "America/Lima",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": "America/Lima",
        },
        "conferenceData": {
            "createRequest": {
                "requestId": f"rce-upt-{int(start_dt.timestamp())}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 15},
                {"method": "email", "minutes": 30},
            ],
        },
    }

    if attendees and delegate_email:
        event_body["attendees"] = [{"email": email} for email in attendees]

    calendar_id = getattr(settings, "GOOGLE_CALENDAR_ID", "primary")

    try:
        created_event = (
            service.events() .insert(
                calendarId=calendar_id,
                body=event_body,
                conferenceDataVersion=1,
                sendUpdates="all" if (
                    attendees and delegate_email) else "none",
            ) .execute())
        meet_link = created_event.get("hangoutLink") or created_event.get(
            "conferenceData", {}
        ).get("entryPoints", [{}])[0].get("uri", "")

        if not meet_link:
            room_hash = f"rce-upt-{int(start_dt.timestamp())}"
            meet_link = f"https://meet.jit.si/{room_hash}"

    except Exception:
        event_body.pop("conferenceData", None)
        event_body.pop("attendees", None)

        try:
            created_event = (
                service.events()
                .insert(
                    calendarId=calendar_id,
                    body=event_body,
                    sendUpdates="none",
                )
                .execute()
            )
            event_id = created_event["id"]
            html_link = created_event.get("htmlLink", "")
        except Exception:
            event_id = f"local-{int(start_dt.timestamp())}"
            html_link = ""

        room_hash = f"rce-upt-{int(start_dt.timestamp())}"
        meet_link = f"https://meet.jit.si/{room_hash}"

        return {
            "event_id": event_id,
            "meet_link": meet_link,
            "html_link": html_link,
            "start": start_dt.isoformat(),
            "end": (
                start_dt +
                timedelta(
                    minutes=duration_minutes)).isoformat(),
        }

    return {
        "event_id": created_event["id"],
        "meet_link": meet_link,
        "html_link": created_event.get("htmlLink", ""),
        "start": created_event["start"]["dateTime"],
        "end": created_event["end"]["dateTime"],
    }


def delete_meet_event(event_id: str) -> bool:
    try:
        service = _get_service()
        calendar_id = getattr(settings, "GOOGLE_CALENDAR_ID", "primary")
        service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
        return True
    except Exception:
        return False
