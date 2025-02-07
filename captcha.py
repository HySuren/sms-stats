from temu_captcha_solver import PlaywrightSolver
from playwright.sync_api import Page, sync_playwright
from playwright_stealth import stealth_sync, StealthConfig
import time

api_key = "c6b610b7f5f3afe1f4fe87ea5de7a83d"
proxy = {
    'server': 'gate.smartproxy.com:7000',
    'username': 'danyaH',
    'password': '6+i9rryFRwYmg3Ins7'
}

def captcha_temu(link: str, headers: dict = {}):

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(proxy=proxy)  # Передаем параметры прокси в виде словаря

        config = StealthConfig(
            navigator_languages=False,
            navigator_vendor=False,
            navigator_user_agent=False
        )
        stealth_sync(page, config)

        time.sleep(2)

        page.goto(link)

        sadcaptcha = PlaywrightSolver(page, api_key, headers=headers, proxy=proxy)

        try:
            sadcaptcha.solve_captcha_if_present(retries=5)
            print("Капча успешно решена!")
            browser.close()
            return True
        except Exception as e:
            print(f"Ошибка при решении капчи: {e}")
            browser.close()
            return False