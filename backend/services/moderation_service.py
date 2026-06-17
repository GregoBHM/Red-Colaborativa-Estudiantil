import httpx
from config import get_settings

settings = get_settings()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

TEXT_PROMPT = (
    "Eres un moderador de una plataforma académica universitaria P2P "
    "donde estudiantes piden y ofrecen ayuda gratis entre ellos. "
    "Tu única tarea es detectar si un mensaje tiene una intención "
    "clara de cobrar dinero o comercializar el servicio de tutoría.\n\n"

    "Responde SOLO con \"SI\" o \"NO\".\n\n"

    "Responde \"SI\" si el mensaje:\n"
    "- Ofrece o pide dinero, pagos o transferencias a cambio de ayuda académica\n"
    "- Menciona métodos de pago como Yape, Plin, billeteras digitales, "
    "depósitos bancarios o criptomonedas\n"
    "- Incluye tarifas, precios o cobros por resolver tareas, exámenes o trabajos\n"
    "- Propone vender soluciones, tareas resueltas o hacer fraude académico pagado\n\n"

    "Responde \"NO\" si el mensaje:\n"
    "- Es una conversación académica normal, aunque use palabras como "
    "\"precio\", \"costo\" o \"cuenta\" en contexto no monetario\n"
    "- Habla de precios de libros, matrículas o materiales "
    "(no de cobrar por la ayuda)\n"
    "- Es una pregunta, explicación o debate sobre cualquier "
    "tema de estudio\n\n"
    "Mensaje a analizar: "
)

IMAGE_PROMPT = (
    "Eres un moderador de una plataforma académica universitaria. "
    "Analiza esta imagen y determina si contiene contenido de "
    "monetización indebida.\n\n"
    "Responde SOLO con \"SI\" o \"NO\".\n\n"
    "Responde \"SI\" si la imagen contiene:\n"
    "- Códigos QR de aplicaciones de pago (Yape, Plin, etc.)\n"
    "- Capturas de transferencias bancarias o depósitos\n"
    "- Texto visible que ofrezca cobrar por hacer tareas o exámenes\n"
    "- Información de cuentas bancarias o números de tarjeta\n\n"
    "Responde \"NO\" en cualquier otro caso "
    "(capturas de código, fotos de ejercicios, diagramas, etc.)."
)


async def is_monetization_attempt(
        text: str = "",
        image_url: str = None) -> bool:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return False

    parts = []

    if text and text.strip():
        parts.append({"text": TEXT_PROMPT + text.strip()})

    if image_url and image_url.strip():
        parts = [
            {"text": IMAGE_PROMPT},
            {
                "inline_data": None,
                "file_data": {
                    "mime_type": "image/jpeg",
                    "file_uri": image_url.strip(),
                },
            },
        ]
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(image_url, follow_redirects=True)
                if resp.status_code == 200:
                    content_type = resp.headers.get(
                        "content-type", "image/jpeg").split(";")[0].strip()
                    parts = [
                        {"text": IMAGE_PROMPT},
                        {
                            "inline_data": {
                                "mime_type": content_type,
                                "data": resp.content.hex(),
                            }
                        },
                    ]
                    import base64
                    parts[1]["inline_data"]["data"] = base64.b64encode(
                        resp.content).decode("utf-8")
        except Exception:
            pass

    if not parts:
        return False

    body = {"contents": [{"parts": parts}]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{GEMINI_API_URL}?key={api_key}",
                json=body,
            )
            if response.status_code != 200:
                return False

            data = response.json()
            answer = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
                .strip()
                .upper()
            )
            return answer.startswith("SI")
    except Exception:
        return False
