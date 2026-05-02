from fastapi import WebSocket
from typing import Dict, List, Set
from datetime import datetime, timezone
import json


class ConnectionManager:
    def __init__(self):
        # Set of all active global websockets
        self.active_connections: Set[WebSocket] = set()
        # Mapping from user_id to set of WebSockets
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Reverse mapping: WebSocket to user_id
        self.socket_user: Dict[WebSocket, int] = {}
        # Chat rooms mapping: room_id to set of WebSockets
        self.chat_rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    async def register_user(self, websocket: WebSocket, user_id: int):
        """Asocia un websocket con un usuario específico para presencia online."""
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
            # Era la primera conexión de este usuario, notificar que está online
            await self.broadcast("user_online", {"user_id": user_id})
        
        self.user_connections[user_id].add(websocket)
        self.socket_user[websocket] = user_id
        
        # Opcional: enviarle la lista de todos los online actualmente
        online_users = list(self.user_connections.keys())
        try:
            await websocket.send_text(json.dumps({
                "type": "presence_sync",
                "data": {"online_users": online_users}
            }, default=str))
        except Exception:
            pass

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        # Manejar desconexión de usuario
        if websocket in self.socket_user:
            user_id = self.socket_user[websocket]
            if websocket in self.user_connections.get(user_id, set()):
                self.user_connections[user_id].remove(websocket)
            
            # Si ya no tiene conexiones activas, está offline
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                await self.broadcast("user_offline", {
                    "user_id": user_id,
                    "last_seen_at": datetime.now(timezone.utc).isoformat(),
                })
                
            del self.socket_user[websocket]

        # Remover de todas las salas
        for room_id in list(self.chat_rooms.keys()):
            if websocket in self.chat_rooms[room_id]:
                self.chat_rooms[room_id].remove(websocket)
            if not self.chat_rooms[room_id]:
                del self.chat_rooms[room_id]

    async def join_room(self, room_id: int, websocket: WebSocket):
        if room_id not in self.chat_rooms:
            self.chat_rooms[room_id] = set()
        self.chat_rooms[room_id].add(websocket)

    async def leave_room(self, room_id: int, websocket: WebSocket):
        if room_id in self.chat_rooms:
            if websocket in self.chat_rooms[room_id]:
                self.chat_rooms[room_id].remove(websocket)
            if not self.chat_rooms[room_id]:
                del self.chat_rooms[room_id]

    async def send_to_room(self, room_id: int, event: str, data: dict):
        if room_id not in self.chat_rooms:
            return
        message = json.dumps({"type": event, "data": data}, default=str)
        disconnected = set()
        for ws in self.chat_rooms[room_id]:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            await self.disconnect(ws)

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"type": event, "data": data}, default=str)
        disconnected = set()
        for ws in list(self.active_connections):
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)
        for ws in disconnected:
            await self.disconnect(ws)


manager = ConnectionManager()
