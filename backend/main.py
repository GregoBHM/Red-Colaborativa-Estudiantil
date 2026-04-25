from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from routes.auth import router as auth_router
from routes.doubts import router as doubts_router
from routes.users import router as users_router
from routes.notifications import router as notifications_router
from routes.admin import router as admin_router
from routes.comments import router as comments_router
from routes.chat import router as chat_router
from config import get_settings
from ws_manager import manager
import json
import models
from models.career import Career

settings = get_settings()

Base.metadata.create_all(bind=engine)


# Seed de carreras UPT al iniciar
def seed_careers():
    db = SessionLocal()
    try:
        if db.query(Career).count() == 0:
            careers_data = [
                ("Ingeniería de Sistemas", "FAING"),
                ("Ingeniería Civil", "FAING"),
                ("Ingeniería Electrónica", "FAING"),
                ("Ingeniería Ambiental", "FAING"),
                ("Ingeniería Agroindustrial", "FAING"),
                ("Ingeniería Comercial", "FACEE"),
                ("Ingeniería Industrial", "FAING"),
                ("Arquitectura", "FAU"),
                ("Derecho", "FADE"),
                ("Educación", "FAEDCOH"),
                ("Medicina Humana", "FACSA"),
                ("Odontología", "FACSA"),
                ("Psicología", "FAEDCOH"),
                ("Administración de Negocios Internacionales", "FACEE"),
                ("Ciencias Contables y Financieras", "FACEE"),
                ("Economía", "FACEE"),
            ]
            for name, faculty in careers_data:
                db.add(Career(name=name, faculty=faculty))
            db.commit()
            print(f"✅ {len(careers_data)} carreras UPT insertadas correctamente")
    except Exception as e:
        print(f"⚠️ Error al insertar carreras seed: {e}")
        db.rollback()
    finally:
        db.close()


seed_careers()


app = FastAPI(
    title="Mentoría Académica API",
    description="API para la plataforma de mentoría académica P2P de la UPT",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(doubts_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(comments_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": "Mentoría Académica API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# --- Careers endpoint ---
from sqlalchemy.orm import Session
from fastapi import Depends
from database import get_db
from typing import List
from pydantic import BaseModel


class CareerOut(BaseModel):
    id: int
    name: str
    faculty: str

    class Config:
        from_attributes = True


@app.get("/api/v1/careers", response_model=List[CareerOut])
async def get_careers(db: Session = Depends(get_db)):
    """Devuelve todas las carreras académicas disponibles."""
    return db.query(Career).order_by(Career.name).all()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Manejar comandos de WebSocket para salas de chat
            try:
                msg = json.loads(data)
                action = msg.get("action")
                room_id = msg.get("room_id")

                if action == "join_room" and room_id:
                    await manager.join_room(room_id, websocket)
                    await websocket.send_text(json.dumps({
                        "type": "room_joined", "data": {"room_id": room_id}
                    }))
                elif action == "leave_room" and room_id:
                    await manager.leave_room(room_id, websocket)
                    await websocket.send_text(json.dumps({
                        "type": "room_left", "data": {"room_id": room_id}
                    }))
                elif action == "register" and "user_id" in msg:
                    await manager.register_user(websocket, msg["user_id"])
                elif action == "mark_delivered" and room_id and "user_id" in msg:
                    # Notify sender that messages were delivered to recipient's device
                    await manager.send_to_room(room_id, "messages_delivered", {
                        "room_id": room_id,
                        "receiver_id": msg["user_id"],
                    })
                elif action == "mark_read" and room_id and "user_id" in msg:
                    # Notify sender that messages were read by recipient
                    await manager.send_to_room(room_id, "messages_read", {
                        "room_id": room_id,
                        "reader_id": msg["user_id"],
                    })
            except json.JSONDecodeError:
                pass  # Mensaje no JSON, ignorar
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

