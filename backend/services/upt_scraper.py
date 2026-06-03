import asyncio
import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from database import SessionLocal
from models.career import Career
from models.university_student import UniversityStudent

# Mapeo de IDs de la UPT para las carreras (depe code)
UPT_CAREER_DEPE = {
    "Ingeniería Civil": 314047000,
    "Ingeniería de Sistemas": 314048000,
    "Ingeniería Electrónica": 314049000,
    "Ingeniería Agroindustrial": 314088000,
    "Ingeniería Ambiental": 314061000,
    "Ingeniería Industrial": 314062000,
    "Educación": 313042100,
    "Ciencias de la Comunicación": 313046000,
    "Psicología": 313048001,
    "Derecho": 312041000,
    "Medicina Humana": 315050000,
    "Odontología": 315051000,
    "Ciencias Contables y Financieras": 316054000,
    "Ingeniería Comercial": 316053000,
    "Economía": 316059000,
    "Administración Turístico-Hotelera": 316052000,
    "Administración de Negocios Internacionales": 316055000,
    "Arquitectura": 317055000,
}

async def fetch_students_for_career(depe_id: int) -> list:
    url = f"https://www.upt.edu.pe/upt/web/modulos/alumno.php?depe={depe_id}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except Exception as e:
            print(f"Error fetching UPT students for depe={depe_id}: {e}")
            return []

    html = response.text
    soup = BeautifulSoup(html, "html.parser")
    students_data = []

    # Cada ciclo está en un div con id tab1, tab2, etc.
    # Pero las tablas tienen la clase 'horario'
    tables = soup.find_all("table", class_="horario")
    
    for table in tables:
        # Extraer el ciclo del thead -> th -> "CICLO" (está en la cabecera, pero podemos sacarlo del td)
        tbody = table.find("tbody")
        if not tbody:
            continue
            
        rows = tbody.find_all("tr")
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 3:
                # El formato de la tabla es: [Número, ALUMNO, CICLO]
                full_name = cols[1].get_text(strip=True)
                cycle_str = cols[2].get_text(strip=True)
                
                # Convertir texto "I", "II", "III" a número entero, o guardar el string
                # La base de datos tiene `cycle` como Integer, así que convertimos números romanos o dejamos 0
                cycle_num = roman_to_int(cycle_str)
                
                students_data.append({
                    "full_name": full_name,
                    "cycle": cycle_num
                })
                
    return students_data

def roman_to_int(s: str) -> int:
    roman = {'I': 1, 'V': 5, 'X': 10}
    res = 0
    i = 0
    # Limpiar posibles prefijos como "CICLO - I" -> "I"
    s = s.replace("CICLO", "").replace("-", "").strip()
    
    while i < len(s):
        s1 = roman.get(s[i], 0)
        if (i+1) < len(s):
            s2 = roman.get(s[i+1], 0)
            if s1 >= s2:
                res = res + s1
                i = i + 1
            else:
                res = res + s2 - s1
                i = i + 2
        else:
            res = res + s1
            i = i + 1
    return res

async def sync_upt_data():
    print("Iniciando sincronización de alumnos de la UPT...")
    db: Session = SessionLocal()
    try:
        careers = db.query(Career).all()
        
        for career in careers:
            # Actualizar el upt_id si lo tenemos mapeado y aún no está en la BD
            if career.name in UPT_CAREER_DEPE and not career.upt_id:
                career.upt_id = UPT_CAREER_DEPE[career.name]
                db.commit()

            if not career.upt_id:
                continue
                
            students = await fetch_students_for_career(career.upt_id)
            if not students:
                continue
                
            # Upsert students
            # En SQLite/Postgres básico, podemos buscar todos los estudiantes de la carrera
            # e insertar los que no existan, o actualizar ciclo.
            existing_students = db.query(UniversityStudent).filter(UniversityStudent.career_id == career.id).all()
            existing_map = {s.full_name: s for s in existing_students}
            
            new_count = 0
            update_count = 0
            
            for s_data in students:
                name = s_data["full_name"]
                cycle = s_data["cycle"]
                
                if name in existing_map:
                    # Update
                    if existing_map[name].cycle != cycle:
                        existing_map[name].cycle = cycle
                        update_count += 1
                else:
                    # Insert
                    new_student = UniversityStudent(
                        full_name=name,
                        cycle=cycle,
                        career_id=career.id
                    )
                    db.add(new_student)
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
