// URL вашего API
const apiUrl = "http://s3.c4ke.fun/sms-stats";

// Элементы таблицы
const tableBody = document.getElementById("table-body");
const totalDelivered = document.getElementById("total-delivered");
const totalUndelivered = document.getElementById("total-undelivered");
const totalPercentage = document.getElementById("total-percentage");

// Функция для загрузки данных с бэка
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

// Функция для рендера таблицы
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

// Инициализация (первоначальная загрузка данных)
fetchData(); // Загружаем данные без фильтров
