from temu_captcha_solver import PlaywrightSolver
from playwright.sync_api import Page, sync_playwright
from playwright_stealth import stealth_sync, StealthConfig
import time

api_key = "c6b610b7f5f3afe1f4fe87ea5de7a83d"


def parse_proxy(proxy_string: str):
    user_pass, server_port = proxy_string.split('@')
    username, password = user_pass.split(':')
    server, port = server_port.split(':')

    proxy_dict = {
        'server': f"{server}:{port}",
        'username': username,
        'password': password
    }

    return proxy_dict

def captcha_temu(link: str, cookie: str, user_agent: str, proxy_string: str):
    proxys = parse_proxy(proxy_string)

    headers = {
        'cookie': cookie,
        'user-agent': user_agent
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(proxy=proxys)

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
