from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models.chat import ChatRoom, ChatMessage
from models.user import User
from models.doubt import Doubt
from models.rating import Rating
from services.xp_service import award_xp_for_help
from services.push_service import create_and_push_notification
from services.google_meet_service import create_meet_event
from ws_manager import manager

router = APIRouter(prefix="/chat", tags=["Chat"])

# --- Palabras prohibidas para moderación ---
BANNED_WORDS = [
    "pago", "dinero", "cobro", "precio", "transferencia",
    "yape", "plin", "bitcoin", "cuenta", "deposito",
    "cobra", "costo", "tarifa", "comisión", "negocio",
]


def check_flagged(content: str) -> bool:
    lower = content.lower()
    return any(word in lower for word in BANNED_WORDS)


# --- Schemas ---

class ChatRoomCreate(BaseModel):
    doubt_id: int
    mentor_id: int
    student_id: int


class ChatRoomOut(BaseModel):
    id: int
    doubt_id: int
    doubt_title: Optional[str] = None
    mentor_id: int
    mentor_name: Optional[str] = None
    mentor_photo: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_photo: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    meet_link: Optional[str] = None
    created_at: datetime
    closed_at: Optional[datetime] = None
    last_message: Optional[str] = None


class MessageCreate(BaseModel):
    sender_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    chat_room_id: int
    sender_id: int
    sender_name: Optional[str] = None
    sender_photo: Optional[str] = None
    content: str
    is_flagged: bool
    status: str = "sent"
    is_deleted: bool = False
    created_at: datetime


class ScheduleUpdate(BaseModel):
    scheduled_at: datetime


class CloseRoom(BaseModel):
    stars: int
    comment: Optional[str] = None


class MeetOut(BaseModel):
    meet_link: str
    event_id: Optional[str] = None
    html_link: Optional[str] = None
    scheduled_at: datetime


# --- Endpoints ---

@router.post("/rooms", response_model=ChatRoomOut, status_code=status.HTTP_201_CREATED)
async def create_chat_room(payload: ChatRoomCreate, db: Session = Depends(get_db)):
    # Si ya existe una sala activa para esta duda con este mentor, devolver esa sala
    existing = (
        db.query(ChatRoom)
        .filter(
            ChatRoom.doubt_id == payload.doubt_id,
            ChatRoom.mentor_id == payload.mentor_id,
            ChatRoom.status == "active",
        )
        .first()
    )
    if existing:
        return _build_room_out(db, existing)

    room = ChatRoom(
        doubt_id=payload.doubt_id,
        mentor_id=payload.mentor_id,
        student_id=payload.student_id,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    return _build_room_out(db, room)


@router.get("/rooms/user/{user_id}", response_model=List[ChatRoomOut])
async def get_user_rooms(user_id: int, db: Session = Depends(get_db)):
    rooms = (
        db.query(ChatRoom)
        .filter((ChatRoom.mentor_id == user_id) | (ChatRoom.student_id == user_id))
        .order_by(ChatRoom.created_at.desc())
        .all()
    )
    # Filtrar en memoria por facilidad con arrays JSON
    visible_rooms = [r for r in rooms if user_id not in (r.hidden_by or [])]
    return [_build_room_out(db, r) for r in visible_rooms]


@router.get("/rooms/{room_id}/messages", response_model=List[MessageOut])
async def get_room_messages(room_id: int, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.chat_room_id == room_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    result = []
    for m in messages:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        result.append(MessageOut(
            id=m.id,
            chat_room_id=m.chat_room_id,
            sender_id=m.sender_id,
            sender_name=sender.display_name if sender else "Desconocido",
            sender_photo=sender.photo_url if sender else None,
            content="Este mensaje fue eliminado" if m.is_deleted else m.content,
            is_flagged=m.is_flagged,
            status=m.status or "sent",
            is_deleted=m.is_deleted or False,
            created_at=m.created_at,
        ))
    return result


@router.post("/rooms/{room_id}/messages", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(room_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Esta sala está cerrada")

    # Verificar que el sender es parte de la sala
    if payload.sender_id not in (room.mentor_id, room.student_id):
        raise HTTPException(status_code=403, detail="No eres parte de esta sala")

    flagged = check_flagged(payload.content)

    message = ChatMessage(
        chat_room_id=room_id,
        sender_id=payload.sender_id,
        content=payload.content.strip(),
        is_flagged=flagged,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    sender = db.query(User).filter(User.id == payload.sender_id).first()

    msg_out = MessageOut(
        id=message.id,
        chat_room_id=message.chat_room_id,
        sender_id=message.sender_id,
        sender_name=sender.display_name if sender else "Desconocido",
        sender_photo=sender.photo_url if sender else None,
        content=message.content,
        is_flagged=message.is_flagged,
        status=message.status or "sent",
        is_deleted=False,
        created_at=message.created_at,
    )

    # Emitir por WebSocket al room
    await manager.send_to_room(room_id, "new_message", msg_out.model_dump(mode="json"))

    # Push notification al otro participante
    recipient_id = room.student_id if payload.sender_id == room.mentor_id else room.mentor_id
    sender_name = sender.display_name if sender else "Alguien"
    create_and_push_notification(
        db, recipient_id,
        title=f"Nuevo mensaje de {sender_name}",
        body=payload.content[:100],
        notification_type="chat",
        reference_id=room_id,
    )

    return msg_out


@router.patch("/rooms/{room_id}/schedule")
async def schedule_session(room_id: int, payload: ScheduleUpdate, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="No se puede programar una sala cerrada")

    room.scheduled_at = payload.scheduled_at
    db.commit()

    await manager.send_to_room(room_id, "session_scheduled", {
        "room_id": room_id,
        "scheduled_at": payload.scheduled_at.isoformat(),
    })

    # Push notification al estudiante
    mentor = db.query(User).filter(User.id == room.mentor_id).first()
    create_and_push_notification(
        db, room.student_id,
        title="Sesión Programada 📅",
        body=f"{mentor.display_name if mentor else 'Tu mentor'} programó una sesión para {payload.scheduled_at.strftime('%d/%m %H:%M')}",
        notification_type="schedule",
        reference_id=room_id,
    )

    return {"message": "Sesión programada", "scheduled_at": payload.scheduled_at}


@router.post("/rooms/{room_id}/meet", response_model=MeetOut)
async def create_google_meet(
    room_id: int,
    requester_id: Optional[int] = None,
    start_dt: Optional[str] = None,
    db: Session = Depends(get_db),
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="No se puede crear Meet en sala cerrada")

    # Solo el mentor autoriza la creación del Meet
    if requester_id and requester_id != room.mentor_id:
        raise HTTPException(status_code=403, detail="Solo el mentor puede crear el Meet")

    mentor = db.query(User).filter(User.id == room.mentor_id).first()
    student = db.query(User).filter(User.id == room.student_id).first()
    doubt = db.query(Doubt).filter(Doubt.id == room.doubt_id).first()

    # Determinar fecha/hora del evento
    from datetime import timezone
    from datetime import datetime as dt
    
    if start_dt:
        start_time = dt.fromisoformat(start_dt.replace("Z", "+00:00"))
    else:
        start_time = room.scheduled_at or dt.now(timezone.utc).replace(tzinfo=timezone.utc)
        
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)

    summary = f"Mentoría RCE UPT: {doubt.title if doubt else 'Sesión de ayuda'}"
    description = (
        f"Sesión de mentoría académica.\n"
        f"Mentor: {mentor.display_name if mentor else 'N/A'}\n"
        f"Estudiante: {student.display_name if student else 'N/A'}\n"
        f"Plataforma: RCE UPT — Red Colaborativa Estudiantil"
    )
    attendees = []
    if mentor and mentor.email:
        attendees.append(mentor.email)
    if student and student.email:
        attendees.append(student.email)

    try:
        meet_data = create_meet_event(
            summary=summary,
            start_dt=start_time,
            duration_minutes=60,
            description=description,
            attendees=attendees,
            delegate_email=mentor.email if mentor else None,
        )
    except Exception as e:
        # Fallback silencioso a Jitsi Meet para que la app nunca muestre error
        room_hash = f"rce-upt-{int(start_time.timestamp())}"
        meet_data = {
            "meet_link": f"https://meet.jit.si/{room_hash}",
            "event_id": f"local-{int(start_time.timestamp())}",
            "html_link": "",
        }

    # Guardar el meet_link en la sala
    room.meet_link = meet_data["meet_link"]
    if not room.scheduled_at:
        room.scheduled_at = start_time
    db.commit()

    # Notificar vía WebSocket
    await manager.send_to_room(room_id, "meet_created", {
        "room_id": room_id,
        "meet_link": meet_data["meet_link"],
        "scheduled_at": start_time.isoformat(),
    })

    # Push notification al estudiante
    mentor_name = mentor.display_name if mentor else "Tu mentor"
    create_and_push_notification(
        db, room.student_id,
        title="📹 Meet creado para tu sesión",
        body=f"{mentor_name} creó una sala de Jitsi Meet. ¡Úsala para tu mentoría!",
        notification_type="meet",
        reference_id=room_id,
    )

    return MeetOut(
        meet_link=meet_data["meet_link"],
        event_id=meet_data.get("event_id"),
        html_link=meet_data.get("html_link"),
        scheduled_at=start_time,
    )


@router.delete("/rooms/{room_id}/meet")
async def delete_google_meet(
    room_id: int,
    requester_id: int,
    db: Session = Depends(get_db),
):
    """
    Elimina el enlace de Meet actual de la sala.
    Solo el mentor puede hacerlo.
    """
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if requester_id != room.mentor_id:
        raise HTTPException(status_code=403, detail="Solo el mentor puede eliminar el Meet")
    
    room.meet_link = None
    room.event_id = None
    db.commit()
    
    student = db.query(User).filter(User.id == room.student_id).first()
    if student:
        create_and_push_notification(
            db=db,
            user_id=student.id,
            title="Reunión finalizada 📹",
            body="El mentor ha finalizado la sala de Meet.",
            notification_type="meet",
            reference_id=room_id,
        )

    return {"message": "Meet eliminado", "meet_link": None}


@router.patch("/rooms/{room_id}/close")
async def close_chat_room(room_id: int, payload: CloseRoom, db: Session = Depends(get_db)):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    if room.status == "closed":
        raise HTTPException(status_code=400, detail="Esta sala ya está cerrada")

    # Cerrar la sala
    room.status = "closed"
    room.closed_at = func.now()
    db.commit()

    # Crear rating
    rating = Rating(
        doubt_id=room.doubt_id,
        reviewer_id=room.student_id,
        mentor_id=room.mentor_id,
        stars=payload.stars,
        comment=payload.comment,
    )
    db.add(rating)
    db.commit()

    # Otorgar XP al mentor
    updated_mentor = award_xp_for_help(db, room.mentor_id, payload.stars)

    # Marcar la duda como resuelta si aún no lo está
    doubt = db.query(Doubt).filter(Doubt.id == room.doubt_id).first()
    if doubt and doubt.status == "open":
        doubt.status = "resolved"
        doubt.resolved_by = room.mentor_id
        doubt.resolved_at = func.now()
        db.commit()

    # Notificar por WebSocket
    await manager.send_to_room(room_id, "room_closed", {"room_id": room_id})
    await manager.broadcast("doubt_resolved", {"doubt_id": room.doubt_id, "resolver_id": room.mentor_id})

    xp_awarded = 50 + (payload.stars * 10)

    # Push notification al mentor
    create_and_push_notification(
        db, room.mentor_id,
        title="¡Recibiste XP! ⚡",
        body=f"Ganaste {xp_awarded} XP por tu ayuda. {'⭐' * payload.stars}",
        notification_type="xp",
        reference_id=room.doubt_id,
    )

    return {
        "message": "Sala cerrada y mentor calificado",
        "xp_awarded": xp_awarded,
        "mentor_new_xp": updated_mentor.xp_points if updated_mentor else 0,
        "mentor_level": updated_mentor.level if updated_mentor else "Novato",
    }


# --- Helper ---

def _build_room_out(db: Session, room: ChatRoom) -> ChatRoomOut:
    mentor = db.query(User).filter(User.id == room.mentor_id).first()
    student = db.query(User).filter(User.id == room.student_id).first()
    doubt = db.query(Doubt).filter(Doubt.id == room.doubt_id).first()

    last_msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.chat_room_id == room.id)
        .order_by(ChatMessage.created_at.desc())
        .first()
    )

    return ChatRoomOut(
        id=room.id,
        doubt_id=room.doubt_id,
        doubt_title=doubt.title if doubt else None,
        mentor_id=room.mentor_id,
        mentor_name=mentor.display_name if mentor else None,
        mentor_photo=mentor.photo_url if mentor else None,
        student_id=room.student_id,
        student_name=student.display_name if student else None,
        student_photo=student.photo_url if student else None,
        status=room.status,
        scheduled_at=room.scheduled_at,
        meet_link=room.meet_link,
        created_at=room.created_at,
        closed_at=room.closed_at,
        last_message=last_msg.content if last_msg else None,
    )


# --- Read Receipts ---

@router.patch("/rooms/{room_id}/messages/read")
async def mark_messages_read(room_id: int, user_id: int = None, db: Session = Depends(get_db)):
    """Marca todos los mensajes no leídos de la otra persona como 'read'."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    # Actualizar mensajes del otro usuario (no los míos) a 'read'
    updated = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.chat_room_id == room_id,
            ChatMessage.sender_id != user_id,
            ChatMessage.status != "read",
        )
        .update({"status": "read"})
    )
    db.commit()

    if updated > 0:
        # Notificar al remitente que sus mensajes fueron leídos
        await manager.send_to_room(room_id, "messages_read", {
            "room_id": room_id,
            "reader_id": user_id,
        })

    return {"updated": updated}


# --- Soft Delete ---

@router.delete("/messages/{message_id}")
async def soft_delete_message(message_id: int, user_id: int = None, db: Session = Depends(get_db)):
    """Soft-delete de un mensaje. El contenido se oculta pero se mantiene en BD para auditoría."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    # Solo el autor del mensaje puede eliminarlo
    user = db.query(User).filter(User.id == user_id).first()
    if message.sender_id != user_id and (not user or user.role != "admin"):
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este mensaje")

    message.is_deleted = True
    db.commit()

    # Notificar a la sala que el mensaje fue eliminado
    await manager.send_to_room(message.chat_room_id, "message_deleted", {
        "message_id": message_id,
        "room_id": message.chat_room_id,
    })

    return {"message": "Mensaje eliminado"}


@router.delete("/rooms/{room_id}")
async def hide_chat_room(room_id: int, user_id: int = None, db: Session = Depends(get_db)):
    """Oculta una sala de chat para un usuario específico (Borrado lógico del chat)."""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id es requerido")

    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")

    if user_id not in [room.mentor_id, room.student_id]:
        raise HTTPException(status_code=403, detail="No perteneces a este chat")

    hidden = list(room.hidden_by) if room.hidden_by else []
    if user_id not in hidden:
        hidden.append(user_id)
        room.hidden_by = hidden
        db.commit()

    return {"message": "Chat eliminado correctamente"}
