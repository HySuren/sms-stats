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
  data.forEach((service) => {
    servicesTableBody.innerHTML += `
      <tr>
        <td>${service.service_name}</td>
        <td>${service.enabled ? "Активен" : "Неактивен"}</td>
        <td>
          <button class="toggle-status-btn" data-name="${service.service_name}" data-status="${service.enabled}">
            ${service.enabled ? "Отключить" : "Включить"}
          </button>
          <button class="delete-service-btn" data-name="${service.service_name}">Удалить</button>
        </td>
      </tr>
    `;
  });

  document.querySelectorAll(".toggle-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleServiceStatus(btn.getAttribute("data-name"), btn.getAttribute("data-status") !== "true");
    });
  });

  document.querySelectorAll(".delete-service-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteService(btn.getAttribute("data-name")));
  });
}

// Изменение статуса сервиса
function toggleServiceStatus(serviceName, newStatus) {
  fetch(`${configApiUrl}/${encodeURIComponent(serviceName)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: newStatus }), // Теперь только "enabled"
  })
    .then(() => {
      alert("Статус сервиса обновлен.");
      fetchServices();
    })
    .catch((error) => {
      console.error("Ошибка обновления статуса:", error);
      alert("Не удалось обновить статус сервиса.");
    });
}

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
