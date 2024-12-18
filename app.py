from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime, timedelta
import sqlite3
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

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
DATABASE = os.path.expanduser("~/app/Bomber/sms_stats.db")

# Модель ответа
class SMSStat(BaseModel):
    service_name: str
    delivered: int
    not_delivered: int
    percentage: float

class Service(BaseModel):
    service_name: str
    enabled: bool


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/stats", response_class=HTMLResponse)
def get_stats():
    html_file = Path("static/main.html").read_text()
    return HTMLResponse(content=html_file)

def query_database(query: str, params: tuple = ()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


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

# --- Маршрут для получения списка сервисов ---
@app.get("/service-config", response_model=list[Service])
def get_services():
    """
    Возвращает список всех сервисов из таблицы config.
    """
    conn = get_db_connection()
    rows = conn.execute("SELECT service_name, enabled FROM config").fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Сервисы не найдены")

    return [Service(service_name=row["service_name"], enabled=bool(row["enabled"])) for row in rows]


# --- Маршрут для добавления нового сервиса ---
@app.post("/service-config", response_model=Service)
def add_service(service: Service):
    """
    Добавляет новый сервис в таблицу config.
    """
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO config (service_name, enabled) VALUES (?, ?)",
            (service.service_name, int(service.enabled)),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Сервис с таким именем уже существует")
    finally:
        conn.close()

    return service


# --- Маршрут для обновления статуса сервиса ---
@app.patch("/service-config/{service_name}", response_model=Service)
def update_service_status(service_name: str, service: Service):
    """
    Обновляет статус (enabled/disabled) указанного сервиса.
    """
    conn = get_db_connection()
    cursor = conn.execute(
        "UPDATE config SET enabled = ? WHERE service_name = ?",
        (int(service.enabled), service_name),
    )
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Сервис с указанным именем не найден")

    return service


# --- Маршрут для удаления сервиса ---
@app.delete("/service-config/{service_name}")
def delete_service(service_name: str):
    """
    Удаляет сервис из таблицы config.
    """
    conn = get_db_connection()
    cursor = conn.execute("DELETE FROM config WHERE service_name = ?", (service_name,))
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Сервис с указанным именем не найден")

    return {"message": "Сервис успешно удален"}