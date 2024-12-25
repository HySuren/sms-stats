document.getElementById('toggle-theme').addEventListener('click', function () {
  const body = document.body;

  // Проверяем, активна ли новогодняя тема
  if (body.classList.contains('new-year')) {
    // Убираем новогоднюю тему
    body.classList.remove('new-year');
    body.style.background = 'linear-gradient(180deg, #000, #2f2f2f, #595959 30%)';
  } else {
    // Активируем новогоднюю тему
    body.classList.add('new-year');
    body.style.background = 'url(/static/snow.png), linear-gradient(180deg, #8b0000, #440000, #300000)';
    body.style.backgroundSize = 'cover'; // Чтобы изображение занимало весь экран
    body.style.backgroundAttachment = 'fixed'; // Закрепляем фон
  }
});
