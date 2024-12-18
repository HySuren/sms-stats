// URL вашего API
const apiUrl = "http://s3.c4ke.fun/sms-stats";
const configApiUrl = "http://s3.c4ke.fun/service-config"; // Новый API для управления сервисами

// Элементы таблицы статистики
const tableBody = document.getElementById("table-body");
const totalDelivered = document.getElementById("total-delivered");
const totalUndelivered = document.getElementById("total-undelivered");
const totalPercentage = document.getElementById("total-percentage");

// Элементы управления сервисами
const servicesTableBody = document.getElementById("services-table-body"); // Для таблицы сервисов
const addServiceForm = document.getElementById("add-service-form"); // Форма добавления нового сервиса

// Функция для загрузки статистики
function fetchData(filter = null, startDate = null, endDate = null) {
  let url = new URL(apiUrl);

  // Добавляем параметры фильтров в запрос
  if (filter) {
    url.searchParams.append("filter", filter);
  }
  if (startDate) {
    url.searchParams.append("start_date", startDate);
  }
  if (endDate) {
    url.searchParams.append("end_date", endDate);
  }

  // Выполняем AJAX-запрос к API
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка сети при загрузке данных");
      }
      return response.json();
    })
    .then((data) => {
      renderTable(data);
    })
    .catch((error) => {
      console.error("Ошибка при загрузке данных:", error);
      alert("Не удалось загрузить данные. Проверьте подключение к серверу.");
    });
}

// Функция для отображения таблицы статистики
function renderTable(data) {
  tableBody.innerHTML = "";

  let totalDel = 0;
  let totalUndel = 0;

  // Рендер строк таблицы
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

  // Расчет итогов
  const totalPercent = ((totalDel / (totalDel + totalUndel)) * 100).toFixed(2);

  // Отображение итогов
  totalDelivered.textContent = totalDel;
  totalUndelivered.textContent = totalUndel;
  totalPercentage.textContent = `${totalPercent}%`;
}

// Добавляем обработчики для фильтров (кнопки быстрого доступа)
document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const filter = btn.getAttribute("data-filter");
    fetchData(filter); // Запрашиваем данные с сервера
  });
});

// Обработка фильтрации по диапазону дат
document.getElementById("apply-dates").addEventListener("click", () => {
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;

  if (startDate && endDate) {
    fetchData(null, startDate, endDate); // Запрашиваем данные с сервера
  } else {
    alert("Пожалуйста, выберите начальную и конечную даты.");
  }
});

// Новый функционал: Загрузка списка сервисов для управления
function fetchServices() {
  fetch(configApiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка сети при загрузке списка сервисов");
      }
      return response.json();
    })
    .then((data) => {
      renderServicesTable(data);
    })
    .catch((error) => {
      console.error("Ошибка при загрузке списка сервисов:", error);
      alert("Не удалось загрузить список сервисов.");
    });
}

// Функция для рендера таблицы управления сервисами
function renderServicesTable(data) {
  servicesTableBody.innerHTML = "";

  data.forEach((service) => {
    servicesTableBody.innerHTML += `
      <tr>
        <td>${service.id}</td>
        <td>${service.name}</td>
        <td>${service.status ? "Активен" : "Неактивен"}</td>
        <td>
          <button class="toggle-status-btn" data-id="${service.id}" data-status="${service.status}">
            ${service.status ? "Отключить" : "Включить"}
          </button>
          <button class="delete-service-btn" data-id="${service.id}">Удалить</button>
        </td>
      </tr>
    `;
  });

  // Добавляем обработчики для кнопок включения/отключения и удаления
  document.querySelectorAll(".toggle-status-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const serviceId = btn.getAttribute("data-id");
      const currentStatus = btn.getAttribute("data-status") === "true";
      toggleServiceStatus(serviceId, !currentStatus);
    });
  });

  document.querySelectorAll(".delete-service-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const serviceId = btn.getAttribute("data-id");
      deleteService(serviceId);
    });
  });
}

// Функция для включения/отключения сервиса
function toggleServiceStatus(serviceId, newStatus) {
  fetch(`${configApiUrl}/${serviceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка при обновлении статуса сервиса");
      }
      return response.json();
    })
    .then(() => {
      alert("Статус сервиса обновлен!");
      fetchServices(); // Обновляем таблицу сервисов
    })
    .catch((error) => {
      console.error("Ошибка при обновлении статуса сервиса:", error);
      alert("Не удалось обновить статус сервиса.");
    });
}

// Функция для удаления сервиса
function deleteService(serviceId) {
  fetch(`${configApiUrl}/${serviceId}`, {
    method: "DELETE",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Ошибка при удалении сервиса");
      }
      alert("Сервис успешно удален!");
      fetchServices(); // Обновляем таблицу сервисов
    })
    .catch((error) => {
      console.error("Ошибка при удалении сервиса:", error);
      alert("Не удалось удалить сервис.");
    });
}

// Обработка добавления нового сервиса
addServiceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const newServiceName = document.getElementById("new-service-name").value;

  if (newServiceName) {
    fetch(configApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newServiceName }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Ошибка при добавлении нового сервиса");
        }
        alert("Новый сервис добавлен!");
        addServiceForm.reset();
        fetchServices(); // Обновляем таблицу сервисов
      })
      .catch((error) => {
        console.error("Ошибка при добавлении нового сервиса:", error);
        alert("Не удалось добавить новый сервис.");
      });
  } else {
    alert("Введите имя нового сервиса.");
  }
});

// Инициализация: Загрузка данных
fetchData(); // Загрузка статистики
fetchServices(); // Загрузка сервисов
