from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from sqlalchemy import text
from routes.auth import router as auth_router
from routes.doubts import router as doubts_router
from routes.users import router as users_router
from routes.notifications import router as notifications_router
from routes.admin import router as admin_router
from routes.comments import router as comments_router
from routes.chat import router as chat_router
from routes.verification import router as verification_router
from routes.reports import router as reports_router
from routes.labs import router as labs_router
from routes.bookmarks import router as bookmarks_router
from routes.upload import router as upload_router
from models.laboratory import Laboratory  # noqa: F401
from models.bookmark import Bookmark  # noqa: F401
from services.upt_scraper import sync_upt_data
from config import get_settings
from ws_manager import manager
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from typing import List, Optional
from pydantic import BaseModel
from models.career import Career
from models.university_student import UniversityStudent
import asyncio
import json

settings = get_settings()

Base.metadata.create_all(bind=engine)


inner_app = FastAPI(
    title="API Red Colaborativa Estudiantil UPT",
    description="API para la plataforma de mentoría académica P2P de la Universidad Privada de Tacna",
    version="2.0.0",
)

inner_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

inner_app.include_router(auth_router, prefix="/api/v1")
inner_app.include_router(doubts_router, prefix="/api/v1")
inner_app.include_router(users_router, prefix="/api/v1")
inner_app.include_router(notifications_router, prefix="/api/v1")
inner_app.include_router(admin_router, prefix="/api/v1")
inner_app.include_router(comments_router, prefix="/api/v1")
inner_app.include_router(chat_router, prefix="/api/v1")
inner_app.include_router(verification_router, prefix="/api/v1")
inner_app.include_router(reports_router, prefix="/api/v1")
inner_app.include_router(labs_router, prefix="/api/v1")
inner_app.include_router(bookmarks_router, prefix="/api/v1")
inner_app.include_router(upload_router, prefix="/api/v1")


def run_db_migrations():
    migrations = [
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS msg_type VARCHAR(20) NOT NULL DEFAULT 'text'",
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'sent'",
        "ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS hidden_by JSON DEFAULT '[]'",
        "ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS meet_link VARCHAR(500)",
        "ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE",
        "ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            conn.execute(text(sql))
        conn.commit()


run_db_migrations()


@inner_app.on_event("startup")
async def startup_event():
    asyncio.create_task(sync_upt_data())


@inner_app.get("/")
async def root():
    return {
        "app": "API Red Colaborativa Estudiantil UPT",
        "version": "2.0.0",
        "status": "En línea y funcionando 🚀",
        "docs": "/docs",
    }


@inner_app.get("/health")
async def health_check():
    return {"status": "healthy"}


class CareerOut(BaseModel):
    id: int
    name: str
    faculty: str

    class Config:
        from_attributes = True


@inner_app.get("/api/v1/careers", response_model=List[CareerOut])
async def get_careers(db: Session = Depends(get_db)):
    return db.query(Career).order_by(Career.name).all()


@inner_app.get("/api/v1/students")
async def get_students(
    career_name: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(UniversityStudent)
    if career_name:
        query = query.join(Career).filter(
            Career.name.ilike(f"%{career_name}%"))
    students = query.limit(limit).all()
    return {
        "total_mostrados": len(students),
        "alumnos": [
            {
                "id": s.id,
                "full_name": s.full_name,
                "cycle": s.cycle,
                "career_id": s.career_id
            } for s in students
        ]
    }


@inner_app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                room_id = msg.get("room_id")

                if action == "join_room" and room_id:
                    await manager.join_room(room_id, websocket)
                    await websocket.send_text(json.dumps(
                        {"type": "room_joined", "data": {"room_id": room_id}}
                    ))
                elif action == "leave_room" and room_id:
                    await manager.leave_room(room_id, websocket)
                    await websocket.send_text(json.dumps(
                        {"type": "room_left", "data": {"room_id": room_id}}
                    ))
                elif action == "register" and "user_id" in msg:
                    await manager.register_user(websocket, msg["user_id"])
                elif action == "mark_delivered" and room_id and "user_id" in msg:
                    await manager.send_to_room(room_id, "messages_delivered", {
                        "room_id": room_id,
                        "receiver_id": msg["user_id"],
                    })
                elif action == "mark_read" and room_id and "user_id" in msg:
                    await manager.send_to_room(room_id, "messages_read", {
                        "room_id": room_id,
                        "reader_id": msg["user_id"],
                    })
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


app = FastAPI()
app.mount("/movilesii", inner_app)
app.mount("/", inner_app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True)
