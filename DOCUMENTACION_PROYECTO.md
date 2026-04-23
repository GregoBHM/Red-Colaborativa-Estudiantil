# Documentación Maestra: Mentoría Académica P2P
**Proyecto:** ProyectoMovilesII (Mobile App & FastAPI Backend)

Este documento sirve como la "Fuente de Verdad" para el desarrollo del proyecto. Define la visión, las reglas y el camino a seguir para construir una plataforma escalable y de alto impacto académico.

---

## 1. Visión y Propósito
**Propósito:** Democratizar el éxito académico mediante una **Red de Seguridad Académica P2P**. 
La plataforma no es solo un foro; es un ecosistema diseñado para reducir la deserción estudiantil. Al conectar a estudiantes que dominan un tema con otros que necesitan ayuda inmediata, eliminamos la frustración y fomentamos la colaboración institucional.

---

## 2. Actores del Sistema

| Actor | Responsabilidad | Objetivo Principal |
| :--- | :--- | :--- |
| **Estudiante** | Solicitante y Tutor | Resolver sus dudas o ayudar a otros para ganar prestigio (XP). |
| **Docente** | Observador de Analítica | Identificar temas críticos de error en sus cursos mediante dashboards de IA. |
| **Administrador** | Gestor de Red | Emitir certificados oficiales y validar accesos institucionales. |

---

## 3. La Temática: Gamificación y Progresión (XP)

Para incentivar la ayuda orgánica, implementamos un sistema de **Puntos de Experiencia (XP)** y **Rangos**.

### Sistema de Puntos
- **Responder una duda:** +50 XP (si es marcada como útil).
- **Calificación perfecta:** +20 XP extra.
- **Uso diario:** +5 XP (recompensa por constancia).

### Niveles y Prestigio
1.  🥉 **Novato** (0 - 500 XP): Recién llegado a la red.
2.  🥈 **Tutor Junior** (501 - 1,500 XP): Ayudante frecuente.
3.  🥇 **Tutor Senior** (1,501 - 4,000 XP): Experto reconocido por sus pares.
4.  💎 **Mentor Académico** (+4,000 XP): Estatus máximo. Desbloquea la solicitud de **Certificado de Tutoría Académica** avalado por la facultad.

---

## 4. Estrategia Anti-Monetización (Moderación Silenciosa)
Para evitar que la app se use para cobrar dinero real por tareas:
- **Filtro NLP (Python):** Bloqueo automático de mensajes con palabras clave (Yape, Plin, precio, cobro, etc.).
- **Detección de QRs:** El backend analiza si las imágenes subidas son códigos QR de pago.
- **Shadowbanning:** Los usuarios infractores se vuelven invisibles para el resto de la red sin ser notificados, reduciendo su impacto negativo.

---

## 5. Hoja de Ruta (Phased Roadmap)

### 🚀 Fase 1: El MVP Funcional (Foco Actual)
- **Backend:** Actualizar modelos SQL para incluir XP, Materias y Dudas.
- **Mobile:**
  - Login institucional con Google/Firebase.
  - Edición de Perfil (Visualización de Nivel y XP).
  - Home Feed (Lista de dudas activas filtrables por materia).
  - Publicación de dudas con foto.

### 🎮 Fase 2: Interacción y Chat Avanzado
- Implementar Chat en tiempo real vía Firebase Firestore.
- Lógica de asignación de puntos (XP) al marcar duda como resuelta.
- **Videollamadas y Calendario:** Integración con Google Calendar API. Los alumnos podrán agendar sesiones de mentoría sincrónicas directamente desde el chat, lo cual generará automáticamente un enlace de **Google Meet** para la videollamada.

### 🎓 Fase 3: Ecosistema Universitario
- Eventos de "Semana de Parciales" (XP x3).
- Notificaciones Push inteligentes por curso.
- Módulo de Certificados automáticos para Mentores.

### 🧠 Fase 4: IA y Analítica (Portal Docente)
- Procesamiento de chats con IA (Gemini/OpenAI) para detectar errores comunes.
- Dashboards analíticos en React Web para profesores y directivos.

---

## 6. Estándares de Programación (Clean Code)
- **Backend (Python/FastAPI):** `snake_case` para variables/funciones. Tipado estricto obligatorio. Capas de Rutas -> Servicios -> Modelos.
- **Mobile (React Native):** `camelCase` para variables, `PascalCase` para componentes. Lógica en Hooks, UI en componentes limpios.
- **Documentación:** El código debe ser autodescriptivo. No usar comentarios redundantes.
