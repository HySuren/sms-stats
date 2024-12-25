const snowflakesContainer = document.querySelector('.snowflakes');

function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';

    snowflake.textContent = '❄️';

    snowflake.style.left = Math.random() * 100 + 'vw';

    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    snowflake.style.animationDelay = Math.random() * 5 + 's';

    snowflakesContainer.appendChild(snowflake);

    snowflake.addEventListener('animationend', () => {
        snowflake.remove();
    });
}

setInterval(createSnowflake, 300);
