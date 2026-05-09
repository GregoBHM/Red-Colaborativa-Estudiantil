from firebase_admin import messaging
from sqlalchemy.orm import Session
from models.user import User
from models.notification import Notification
import logging

logger = logging.getLogger(__name__)


def create_and_push_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str = "general",
    reference_id: int = None,
):
    """
    Creates a notification in the database AND sends a push notification
    via Firebase Cloud Messaging if the user has an FCM token registered.
    """
    # 1. Save to database
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        reference_id=reference_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # 2. Send push notification via FCM
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.fcm_token:
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data={
                    "type": notification_type,
                    "reference_id": str(reference_id) if reference_id else "",
                    "notification_id": str(notif.id),
                },
                token=user.fcm_token,
            )
            messaging.send(message)
            logger.info(f"Push sent to user {user_id}")
        except messaging.UnregisteredError:
            # Token is invalid, clear it
            user.fcm_token = None
            db.commit()
            logger.warning(f"Cleared invalid FCM token for user {user_id}")
        except Exception as e:
            logger.error(f"FCM send error for user {user_id}: {e}")

    return notif
