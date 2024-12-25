from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime, timedelta
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
# Инициализация FastAPI
app = FastAPI()

VALID_TOKENS = (os.getenv('TOKEN_1'), os.getenv('TOKEN_2'))

DB_CONFIG = {
    "dbname": os.getenv('DBNAME'),
    "user": os.getenv('DBUSER'),
    "password": os.getenv('DBPASSWORD'),
    "host": os.getenv('DBHOST'),
    "port": os.getenv('DBPORT')
}

# Настройка CORS (для запросов с фронта)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить все источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Путь к SQLite базе
DATABASE = os.path.expanduser("~/app/Bomber/sms_stats.db")

# Модель для получения статистики
class SMSStat(BaseModel):
    service_name: str
    delivered: int
    not_delivered: int
    percentage: float

# Модель для получения списка сервисов
class Service(BaseModel):
    service_name: str
    enabled: bool

# Модель для обновления статуса сервиса
class ServiceUpdate(BaseModel):
    enabled: bool

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/stats", response_class=HTMLResponse)
def get_stats(token: str = ''):
    if token in VALID_TOKENS:
        html_file = Path("static/main.html").read_text()
        return HTMLResponse(content=html_file)
    else:
        raise HTTPException(status_code=401, detail='Неверный токен авторизации')

def query_database(query: str, params: tuple = ()):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()

@app.get("/sms-stats", response_model=List[SMSStat])
def get_sms_stats(
    filter: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    query = """
        SELECT 
            service_name, 
            SUM(delivered) AS delivered, 
            SUM(not_delivered) AS not_delivered 
        FROM sms_stats 
        WHERE 
    """
    params = []

    if filter:
        now = datetime.now()
        if filter == "10min":
            start_time = now - timedelta(minutes=10)
        elif filter == "30min":
            start_time = now - timedelta(minutes=30)
        elif filter == "1h":
            start_time = now - timedelta(hours=1)
        elif filter == "today":
            start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query += " timestamp >= %s"
        params.append(start_time)

    if start_date:
        query += " timestamp >= %s"
        params.append(start_date)
    if end_date:
        query += " AND timestamp <= %s"
        params.append(end_date)

    query += " GROUP BY service_name"
    print(query)
    rows = query_database(query, tuple(params))

    stats = []
    for row in rows:
        delivered = row["delivered"]
        not_delivered = row["not_delivered"]
        percentage = (delivered / (delivered + not_delivered)) * 100 if (delivered + not_delivered) > 0 else 0
        stats.append(
            SMSStat(
                service_name=row["service_name"],
                delivered=delivered,
                not_delivered=not_delivered,
                percentage=round(percentage, 2),
            )
        )
    return stats

# --- Маршрут для получения списка сервисов ---
@app.get("/service-config", response_model=List[Service])
def get_services():
    query = "SELECT service_name, enabled FROM config"
    rows = query_database(query)

    if not rows:
        raise HTTPException(status_code=404, detail="Сервисы не найдены")

    return [Service(service_name=row["service_name"], enabled=row["enabled"]) for row in rows]


# --- Маршрут для добавления нового сервиса ---
@app.post("/service-config", response_model=Service)
def add_service(service: Service):
    query = "INSERT INTO config (service_name, enabled) VALUES (%s, %s) RETURNING service_name, enabled"
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (service.service_name, service.enabled))
            row = cursor.fetchone()
        conn.commit()
        return Service(service_name=row["service_name"], enabled=row["enabled"])
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Сервис с таким именем уже существует")
    finally:
        conn.close()



# --- Маршрут для обновления статуса сервиса ---
@app.patch("/service-config/{service_name}", response_model=Service)
def update_service_status(service_name: str, service: ServiceUpdate):
    query = "UPDATE config SET enabled = %s WHERE service_name = %s RETURNING service_name, enabled"
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, (service.enabled, service_name))
            row = cursor.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Сервис с указанным именем не найден")
        return Service(service_name=row["service_name"], enabled=row["enabled"])
    finally:
        conn.close()



# --- Маршрут для удаления сервиса ---
@app.delete("/service-config/{service_name}")
def delete_service(service_name: str):
    query = "DELETE FROM config WHERE service_name = %s RETURNING service_name"
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(query, (service_name,))
            row = cursor.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Сервис с указанным именем не найден")
        return {"message": "Сервис успешно удален"}
    finally:
        conn.close()

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html(token: str = ''):
    if token in VALID_TOKENS:
        return get_swagger_ui_html(openapi_url=app.openapi_url, title=app.title + " - Docs")
    else:
        raise HTMLResponse(content="Вы не признаны разработчиком 0_0", status_code=403)

@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html(token: str = ''):
    if token in VALID_TOKENS:
        return get_redoc_html(openapi_url=app.openapi_url, title=app.title + " - ReDoc")
    else:
        raise HTMLResponse(content="Вы не признаны разработчиком 0_0", status_code=403)