import asyncio
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from database import SessionLocal
from models.career import Career
from models.university_student import UniversityStudent

UPT_CAREERS = [
    {"name": "Ingeniería Civil", "faculty": "FAING", "upt_id": 314047000},
    {"name": "Ingeniería de Sistemas", "faculty": "FAING", "upt_id": 314048000},
    {"name": "Ingeniería Electrónica", "faculty": "FAING", "upt_id": 314049000},
    {"name": "Ingeniería Agroindustrial", "faculty": "FAING", "upt_id": 314088000},
    {"name": "Ingeniería Ambiental", "faculty": "FAING", "upt_id": 314061000},
    {"name": "Ingeniería Industrial", "faculty": "FAING", "upt_id": 314062000},
    {"name": "Educación", "faculty": "FAEDCOH", "upt_id": 313042100},
    {"name": "Ciencias de la Comunicación", "faculty": "FAEDCOH", "upt_id": 313046000},
    {"name": "Psicología", "faculty": "FAEDCOH", "upt_id": 313048001},
    {"name": "Derecho", "faculty": "FADE", "upt_id": 312041000},
    {"name": "Medicina Humana", "faculty": "FACSA", "upt_id": 315050000},
    {"name": "Odontología", "faculty": "FACSA", "upt_id": 315051000},
    {"name": "Tecnología Médica", "faculty": "FACSA", "upt_id": None},
    {"name": "Ciencias Contables y Financieras", "faculty": "FACEM", "upt_id": 316054000},
    {"name": "Ingeniería Comercial", "faculty": "FACEM", "upt_id": 316053000},
    {"name": "Economía y Microfinanzas", "faculty": "FACEM", "upt_id": 316059000},
    {"name": "Administración", "faculty": "FACEM", "upt_id": None},
    {"name": "Administración Turístico-Hotelera", "faculty": "FACEM", "upt_id": 316052000},
    {"name": "Administración de Negocios Internacionales", "faculty": "FACEM", "upt_id": 316055000},
    {"name": "Arquitectura", "faculty": "FAU", "upt_id": 317055000},
]


async def fetch_students_for_career(depe_id: int) -> list:
    url = f"https://www.upt.edu.pe/upt/web/modulos/alumno.php?depe={depe_id}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except Exception as e:
            print(f"Error fetching UPT students for depe={depe_id}: {e}")
            return []

    soup = BeautifulSoup(response.text, "html.parser")
    students_data = []

    for table in soup.find_all("table", class_="horario"):
        tbody = table.find("tbody")
        if not tbody:
            continue

        for row in tbody.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) >= 3:
                full_name = cols[1].get_text(strip=True)
                cycle_str = cols[2].get_text(strip=True)
                students_data.append({
                    "full_name": full_name,
                    "cycle": roman_to_int(cycle_str)
                })

    return students_data


def roman_to_int(s: str) -> int:
    s = s.replace("CICLO", "").replace("-", "").strip()
    if s.isdigit():
        return int(s)

    roman = {'I': 1, 'V': 5, 'X': 10}
    res = 0
    i = 0
    while i < len(s):
        s1 = roman.get(s[i], 0)
        if (i + 1) < len(s):
            s2 = roman.get(s[i + 1], 0)
            if s1 >= s2:
                res += s1
                i += 1
            else:
                res += s2 - s1
                i += 2
        else:
            res += s1
            i += 1
    return res


async def sync_upt_data():
    print("Iniciando sincronización de alumnos de la UPT...")
    db: Session = SessionLocal()
    try:
        for career_data in UPT_CAREERS:
            existing = db.query(Career).filter(
                Career.name == career_data["name"]).first()
            if not existing:
                db.add(Career(
                    name=career_data["name"],
                    faculty=career_data["faculty"],
                    upt_id=career_data["upt_id"],
                ))
            else:
                existing.faculty = career_data["faculty"]
                if career_data["upt_id"] and not existing.upt_id:
                    existing.upt_id = career_data["upt_id"]
        db.commit()

        for career in db.query(Career).filter(Career.upt_id is not None).all():
            students = await fetch_students_for_career(career.upt_id)
            if not students:
                continue

            existing_map = {
                s.full_name: s
                for s in db.query(UniversityStudent).filter(
                    UniversityStudent.career_id == career.id
                ).all()
            }

            new_count = 0
            update_count = 0

            for s_data in students:
                name = s_data["full_name"]
                cycle = s_data["cycle"]
                if name in existing_map:
                    if existing_map[name].cycle != cycle:
                        existing_map[name].cycle = cycle
                        update_count += 1
                else:
                    db.add(
                        UniversityStudent(
                            full_name=name,
                            cycle=cycle,
                            career_id=career.id))
                    new_count += 1

            db.commit()
            print(f"Carrera {career.name}: {new_count} nuevos, {update_count} actualizados.")

    except Exception as e:
        print(f"Error sincronizando datos UPT: {e}")
        db.rollback()
    finally:
        db.close()
        print("Sincronización de alumnos UPT finalizada.")


if __name__ == "__main__":
    asyncio.run(sync_upt_data())
