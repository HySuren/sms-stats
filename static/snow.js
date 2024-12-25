const snowflakesContainer = document.querySelector('.snowflakes');

function createSnowflake() {
    // Проверяем текущее количество снежинок
    const currentSnowflakes = snowflakesContainer.querySelectorAll('.snowflake').length;

    // Если снежинок меньше 50, создаем новую
    if (currentSnowflakes < 50) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';

        // Случайный символ снежинки
        snowflake.textContent = '❄️';

        // Случайное положение по горизонтали
        snowflake.style.left = Math.random() * 100 + 'vw';

        // Случайная анимация
        snowflake.style.animationDuration = Math.random() * 3 + 2 + 's'; // от 2 до 5 секунд
        snowflake.style.animationDelay = Math.random() * 5 + 's'; // случайная задержка

        snowflakesContainer.appendChild(snowflake);

        // Удаляем снежинку после завершения анимации
        snowflake.addEventListener('animationend', () => {
            snowflake.remove();
        });
    }
}

// Создаем снежинки каждые 500 миллисекунд
setInterval(createSnowflake, 500);
