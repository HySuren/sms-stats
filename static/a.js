// URL API
const apiUrl = "http://s3.c4ke.fun:8008/sms-stats";
const configApiUrl = "http://s3.c4ke.fun:8008/service-config";

// Таблицы и элементы
const tableBody = document.getElementById("table-body");
const totalDelivered = document.getElementById("total-delivered");
const totalUndelivered = document.getElementById("total-undelivered");
const totalPercentage = document.getElementById("total-percentage");
const servicesTableBody = document.getElementById("services-table-body");
const addServiceForm = document.getElementById("add-service-form");

// Переключение вкладок
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.getAttribute("data-tab");

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    document.querySelectorAll(".tab-btn").forEach((tabBtn) => {
      tabBtn.classList.remove("active");
    });

    btn.classList.add("active");
    document.getElementById(tabId).classList.add("active");
  });
});

// Загрузка статистики
function fetchData(filter = null, startDate = null, endDate = null) {
  let url = new URL(apiUrl);

  if (filter) url.searchParams.append("filter", filter);
  if (startDate) url.searchParams.append("start_date", startDate);
  if (endDate) url.searchParams.append("end_date", endDate);

  fetch(url)
    .then((response) => response.json())
    .then((data) => renderTable(data))
    .catch((error) => {
      console.error("Ошибка загрузки статистики:", error);
      alert("Не удалось загрузить статистику.");
    });
}

// Отображение таблицы статистики
function renderTable(data) {
  tableBody.innerHTML = "";
  let totalDel = 0;
  let totalUndel = 0;

  data.forEach((item) => {
    const percent = item.percentage.toFixed(2);
    tableBody.innerHTML += `
      <tr>
        <td>${item.service_name}</td>
        <td>${item.delivered}</td>
        <td>${item.not_delivered}</td>
        <td>${percent}%</td>
      </tr>
    `;
    totalDel += item.delivered;
    totalUndel += item.not_delivered;
  });

  const totalPercent = ((totalDel / (totalDel + totalUndel)) * 100).toFixed(2);
  totalDelivered.textContent = totalDel;
  totalUndelivered.textContent = totalUndel;
  totalPercentage.textContent = `${totalPercent}%`;
}

// Обработка фильтров
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => fetchData(btn.getAttribute("data-filter")));
});

document.getElementById("apply-dates").addEventListener("click", () => {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (startDate && endDate) {
    fetchData(null, startDate, endDate);
  } else {
    alert("Выберите начальную и конечную даты.");
  }
});

// Загрузка сервисов
function fetchServices() {
  fetch(configApiUrl)
    .then((response) => response.json())
    .then((data) => renderServicesTable(data))
    .catch((error) => {
      console.error("Ошибка загрузки сервисов:", error);
      alert("Не удалось загрузить сервисы.");
    });
}

function renderServicesTable(data) {
  servicesTableBody.innerHTML = "";
  let activeCount = 0; // Счётчик активных сервисов

  data.forEach((service) => {
    if (service.enabled) activeCount++; // Увеличиваем счётчик активных сервисов
    servicesTableBody.innerHTML += `
      <tr>
        <td>${service.service_name}</td>
        <td>${service.enabled ? "<b>Активен</b>" : "<b>Неактивен</b>"}</td>
        <td>
          <button class="toggle-status-btn" data-name="${service.service_name}" data-status="${service.enabled}">
            ${service.enabled ? "Отключить" : "Включить"}
          </button>
          <button class="delete-service-btn" data-name="${service.service_name}">Удалить</button>
        </td>
      </tr>
    `;
  });

  // Обновляем отображение количества активных сервисов
  const activeServicesCount = document.getElementById("active-services-count");
  activeServicesCount.textContent = `Активные сервисы: ${activeCount}`;

  // Обработчики событий
  document.querySelectorAll(".toggle-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleServiceStatus(btn.getAttribute("data-name"), btn.getAttribute("data-status") !== "true");
    });
  });

  document.querySelectorAll(".delete-service-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteService(btn.getAttribute("data-name")));
  });
}


// Функция для показа popup
function showPopup(message, success) {
  const popupContainer = document.getElementById('popup-container');
  const popup = document.getElementById('popup'); // Добавлено для обработчика клика
  const popupMessage = document.getElementById('popup-message');

  popupMessage.textContent = message;
  popupContainer.style.display = 'flex';

  // Закрытие при клике на popup
  popup.addEventListener('click', () => {
    popupContainer.style.display = 'none';
    popup.removeEventListener('click', arguments.callee); // Удаляем обработчик после закрытия
  });

  // Скрываем через 3 секунды, если пользователь не закрыл раньше
  setTimeout(() => {
    popupContainer.style.display = 'none';
  }, 3000);
}

// Изменение статуса сервиса
async function toggleServiceStatus(serviceName, newStatus) {
  try {
    const response = await fetch(`${configApiUrl}/${encodeURIComponent(serviceName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newStatus }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || `Ошибка ${response.status}`;
      showPopup(errorMessage, false);
      console.error("Ошибка обновления статуса:", errorData);
    } else {
      showPopup("Статус сервиса обновлен.", true);
      fetchServices();
    }
  } catch (error) {
    console.error("Ошибка обновления статуса:", error);
    showPopup("Не удалось обновить статус сервиса. Проверьте подключение.", false);
  }
}


let realTimeEnabled = false; // Переменная состояния
let realTimeInterval; // Интервал для обновления

const realTimeButton = document.getElementById("real-time-button");

// Функция переключения состояния кнопки
realTimeButton.addEventListener("click", () => {
  realTimeEnabled = !realTimeEnabled; // Меняем состояние

  if (realTimeEnabled) {
    realTimeButton.textContent = "Выключить обновление real-time";
    realTimeButton.classList.remove("real-time-off");
    realTimeButton.classList.add("real-time-on");
    startRealTimeUpdates();
  } else {
    realTimeButton.textContent = "Включить обновление real-time";
    realTimeButton.classList.remove("real-time-on");
    realTimeButton.classList.add("real-time-off");
    stopRealTimeUpdates();
  }
});

// Функция запуска обновления в реальном времени
function startRealTimeUpdates() {
  fetchData(); // Первая загрузка
  realTimeInterval = setInterval(() => {
    fetchData(); // Обновление данных каждые 10 секунд
  }, 1200);
}

// Функция остановки обновления в реальном времени
function stopRealTimeUpdates() {
  clearInterval(realTimeInterval);
}

// Принудительное выключение обновления, если пользователь выбирает фильтры
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (realTimeEnabled) {
      realTimeEnabled = false;
      realTimeButton.textContent = "Включить обновление";
      realTimeButton.classList.remove("real-time-on");
      realTimeButton.classList.add("real-time-off");
      stopRealTimeUpdates();
    }
  });
});

document.getElementById("apply-dates").addEventListener("click", () => {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (startDate && endDate) {
    fetchData(null, startDate, endDate);

    if (realTimeEnabled) {
      realTimeEnabled = false;
      realTimeButton.textContent = "Включить обновление";
      realTimeButton.classList.remove("real-time-on");
      realTimeButton.classList.add("real-time-off");
      stopRealTimeUpdates();
    }
  } else {
    alert("Выберите начальную и конечную даты.");
  }
})


// Удаление сервиса
function deleteService(serviceName) {
  fetch(`${configApiUrl}/${encodeURIComponent(serviceName)}`, { method: "DELETE" })
    .then(() => {
      alert("Сервис удален.");
      fetchServices();
    })
    .catch((error) => {
      console.error("Ошибка удаления сервиса:", error);
      alert("Не удалось удалить сервис.");
    });
}

// Добавление нового сервиса
addServiceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newServiceName = document.getElementById("new-service-name").value;
  const newServiceEnabled = document.getElementById("new-service-enabled").checked;

  if (newServiceName) {
    fetch(configApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_name: newServiceName, enabled: newServiceEnabled }),
    })
      .then(() => {
        alert("Сервис добавлен.");
        fetchServices();
      })
      .catch((error) => {
        console.error("Ошибка добавления сервиса:", error);
        alert("Не удалось добавить сервис.");
      });
  } else {
    alert("Введите имя сервиса.");
  }
});

// Инициализация
fetchData();
fetchServices();
