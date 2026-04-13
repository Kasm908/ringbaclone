import re
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    page.goto("https://best570.poppopgreat.com/landers/yahoo_main_mp_test/index.php?bcid=d7chut81p96s73bfe96g&lpkey=%7Blpkey%7D", timeout=20000, wait_until="networkidle")
    page.wait_for_timeout(2000)
    proceed = page.locator("text=Ignore & Proceed")
    print("Proceed button found:", proceed.count())
    if proceed.count() > 0:
        proceed.click()
        page.wait_for_timeout(3000)
    text = page.inner_text("body")
    print("Text sample:", text[:1000])
    browser.close()