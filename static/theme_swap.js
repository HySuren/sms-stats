document.getElementById('toggle-theme').addEventListener('click', () => {
  const body = document.body;
  body.classList.toggle('new-year');
  document.body.classList.toggle('new-year');

  // Анимация для плавного переключения
  if (body.classList.contains('new-year')) {
    body.style.transition = 'background 1s ease';
  } else {
    body.style.transition = 'background 1s ease';
  }
});
