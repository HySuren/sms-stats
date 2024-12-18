from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import sqlite3

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS (для запросов с фронта)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешить все источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Путь к SQLite базе
DATABASE = "sms_stats.db"

# Модель ответа
class SMSStat(BaseModel):
    service_name: str
    delivered: int
    not_delivered: int
    percentage: float


# Функция для подключения к базе данных
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


# Вспомогательная функция для выполнения SQL-запросов
def query_database(query: str, params: tuple = ()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


# Endpoint для получения данных
# Endpoint для получения данных
@app.get("/sms-stats", response_model=List[SMSStat])
def get_sms_stats(
    filter: Optional[str] = Query(None),  # Фильтр: "10min", "30min", "1h", "today"
    start_date: Optional[str] = Query(None),  # Начальная дата (YYYY-MM-DD)
    end_date: Optional[str] = Query(None),  # Конечная дата (YYYY-MM-DD)
):
    query = """
        SELECT 
            service_name, 
            SUM(delivered) AS delivered, 
            SUM(not_delivered) AS not_delivered 
        FROM sms_stats 
        WHERE 1=1
    """
    params = []

    # Фильтрация по времени
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
        query += " AND timestamp >= ?"
        params.append(start_time)

    # Фильтрация по диапазону дат
    if start_date:
        query += " AND timestamp >= ?"
        params.append(start_date)
    if end_date:
        query += " AND timestamp <= ?"
        params.append(end_date)

    # Группировка по названию сервиса
    query += " GROUP BY service_name"

    # Получение данных из базы
    rows = query_database(query, tuple(params))

    # Формирование ответа
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

@app.get("/config")
def get_config():
    query = "SELECT id, name, active FROM config"
    rows = query_database(query)
    return [{"id": row["id"], "name": row["name"], "active": bool(row["active"])} for row in rows]


@app.post("/config/toggle/{service_id}")
def toggle_service(service_id: int):
    query = "UPDATE config SET active = NOT active WHERE id = ?"
    conn = get_db_connection()
    conn.execute(query, (service_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}


@app.post("/config")
def add_service(service: dict):
    name = service.get("name")
    query = "INSERT INTO config (name, active) VALUES (?, 1)"
    conn = get_db_connection()
    conn.execute(query, (name,))
    conn.commit()
    conn.close()
    return {"status": "success"}
