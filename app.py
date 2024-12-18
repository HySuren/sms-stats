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


# Функция для подключения к базе данных
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

app.mount("/static", StaticFiles(directory="static"), name="static")

# Обрабатываем запрос к /stats и отдаем HTML-страницу
@app.get("/stats", response_class=HTMLResponse)
def get_stats():
    html_file = Path("static/main.html").read_text()
    return HTMLResponse(content=html_file)

# Вспомогательная функция для выполнения SQL-запросов
def query_database(query: str, params: tuple = ()):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows


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

# --- Маршруты для управления сервисами ---
@app.route("/service-config", methods=["GET"])
def get_services():
    """
    Получение списка всех сервисов с их статусами (enabled/disabled).
    """
    conn = get_db_connection()
    services = conn.execute("SELECT service_name, enabled FROM config").fetchall()
    conn.close()

    return jsonify([dict(row) for row in services])

@app.route("/service-config", methods=["POST"])
def add_service():
    """
    Добавление нового сервиса.
    """
    data = request.get_json()
    service_name = data.get("service_name")
    enabled = data.get("enabled", True)  # По умолчанию включен

    if not service_name:
        abort(400, "Параметр 'service_name' обязателен")

    conn = get_db_connection()

    try:
        conn.execute(
            "INSERT INTO config (service_name, enabled) VALUES (?, ?)",
            (service_name, int(enabled)),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        abort(400, "Сервис с таким именем уже существует")
    finally:
        conn.close()

    return jsonify({"message": "Сервис добавлен успешно"}), 201

@app.route("/service-config/<string:service_name>", methods=["PATCH"])
def update_service_status(service_name):
    """
    Обновление статуса сервиса (enabled/disabled).
    """
    data = request.get_json()
    new_status = data.get("enabled")

    if new_status is None:
        abort(400, "Параметр 'enabled' обязателен")

    conn = get_db_connection()
    cursor = conn.execute(
        "UPDATE config SET enabled = ? WHERE service_name = ?",
        (int(new_status), service_name),
    )
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        abort(404, "Сервис с указанным именем не найден")

    return jsonify({"message": "Статус сервиса обновлен успешно"})

@app.route("/service-config/<string:service_name>", methods=["DELETE"])
def delete_service(service_name):
    """
    Удаление сервиса.
    """
    conn = get_db_connection()
    cursor = conn.execute("DELETE FROM config WHERE service_name = ?", (service_name,))
    conn.commit()
    conn.close()

    if cursor.rowcount == 0:
        abort(404, "Сервис с указанным именем не найден")

    return jsonify({"message": "Сервис удален успешно"})
