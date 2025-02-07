from temu_captcha_solver import PlaywrightSolver
from playwright.sync_api import Page, sync_playwright
from playwright_stealth import stealth_sync, StealthConfig
import time

api_key = "c6b610b7f5f3afe1f4fe87ea5de7a83d"


def parse_proxy(proxy_string: str):
    server, port, username, password = proxy_string.split(':')
    proxy_dict = {
        'server': server + ':' + port,
        'username': username,
        'password': password
    }

    return proxy_dict


def captcha_temu(uuid_temu: str, cookie: str, user_agent: str, proxy_string: str):
    proxys = parse_proxy(proxy_string)
    link = f'https://www.temu.com/bgn_verification.html?VerifyAuthToken={uuid_temu}&from=https%3A%2F%2Fwww.temu.com%2F&refer_page_name=home&refer_page_id=10005_1738957391149_k9dvjxmkqh&refer_page_sn=10005&_x_sessn_id=mpfb54oajl'
    headers = {
        'cookie': cookie,
        'user-agent': user_agent
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(proxy=proxys)  # Передаем параметры прокси в виде словаря

        config = StealthConfig(
            navigator_languages=False,
            navigator_vendor=False,
            navigator_user_agent=False
        )
        stealth_sync(page, config)

        time.sleep(2)

        page.goto(link)

        sadcaptcha = PlaywrightSolver(page, api_key, headers=headers, proxy=proxys)

        try:
            sadcaptcha.solve_captcha_if_present(retries=5)
            print("Капча успешно решена!")
            browser.close()
            return True
        except Exception as e:
            print(f"Ошибка при решении капчи: {e}")
            browser.close()
            return False
