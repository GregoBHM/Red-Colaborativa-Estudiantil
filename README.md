# 🎓 Red Colaborativa Estudiantil (RCE UPT)
> **"Democratizando el apoyo académico inmediato mediante el aprendizaje entre pares."**

RCE UPT es una plataforma integral diseñada para estudiantes universitarios que buscan resolver dudas académicas de forma rápida y organizada. Al conectar a estudiantes expertos con aquellos que necesitan ayuda, transformamos el campus en un ecosistema de apoyo mutuo.

---

## 🚀 Características Principales

*   **📸 Consultas Visuales:** Sube fotos de tus ejercicioss para obtener ayuda rápida sin redactar fórmulas complejas.
*   **🎮 Gamificación (Sistema XP):** Gana experiencia ayudando a otros. Sube de nivel desde *Novato* hasta *Mentor Académico*.
*   **💬 Chat en Tiempo Real:** Comunicación instantánea con otros estudiantes a través de WebSockets.
*   **🛡️ Moderación Anti-Monetización:** Filtros NLP y detección de QRs para mantener la red 100% colaborativa y libre de cobros externos.
*   **📅 Integración Académica:** Sincronización con Jitsi Meet para tutorías programadas y videollamadas directas.
*   **⭐ Reputación Dinámica:** Sistema de validación de respuestas basado en la comunidad.

---

## 🛠️ Stack Tecnológico

La plataforma utiliza una arquitectura moderna y escalable:

| Capa | Tecnología |
| :--- | :--- |
| **Frontend Mobile** | [React Native (Expo)](https://reactnative.dev/) |
| **Backend API** | [FastAPI (Python 3.10+)](https://fastapi.tiangolo.com/) |
| **Base de Datos** | [PostgreSQL](https://www.postgresql.org/) + [SQLAlchemy](https://www.sqlalchemy.org/) |
| **Real-time & Auth** | [Firebase](https://firebase.google.com/) (Firestore, Auth, Cloud Messaging) |
| **Despliegue** | [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) |

---

## 📊 Estado del Proyecto (Sprint 1)

| Funcionalidad | Estado |
| :--- | :---: |
| Autenticación Institucional (Google) | ✅ |
| Feed de Dudas (Publicación y Filtros) | ✅ |
| Perfil de Usuario y Rangos XP | ✅ |
| Chat Privado (WebSockets) | ✅ |
| Lógica de Créditos y Recompensas | ✅ |

---

## ⚙️ Configuración Rápida

### Backend
1. Navega a `backend/`.
2. Configura tu `.env` (usa `.env.example` como guía).
3. Levanta los servicios: `docker-compose up --build`.

### Mobile
1. Navega a `mobile/`.
2. Instala dependencias: `npm install`.
3. Inicia el proyecto: `npx expo start`.

---

## 📄 Documentación Adicional
Para más detalles sobre las reglas de negocio, sistema de XP y roadmap completo, consulta la [Documentación Maestra](file:///DOCUMENTACION_PROYECTO.md).

---
© 2026 - Proyecto de Móviles II - UPT

