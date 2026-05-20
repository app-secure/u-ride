from selenium import webdriver
from selenium.webdriver.common.by import By
import time


BASE_URL = "http://localhost:4200"
LOGIN_URL = f"{BASE_URL}/auth/login"

EMAIL = "mramirez1561@uta.edu.ec"
PASSWORD = "Manuelr@mirez21"


def set_ion_input(driver: webdriver.Chrome, css_selector: str, value: str) -> None:
    ion_input = driver.find_element(By.CSS_SELECTOR, css_selector)
    try:
        native = ion_input.shadow_root.find_element(By.CSS_SELECTOR, "input")
    except Exception:
        native = ion_input.find_element(By.CSS_SELECTOR, "input")
    driver.execute_script("arguments[0].value = '';", native)
    native.send_keys(value)


def click_ion_button_by_text(driver: webdriver.Chrome, text: str) -> None:
    button = driver.find_element(By.XPATH, f"//ion-button[contains(normalize-space(.), '{text}')]")
    driver.execute_script("arguments[0].click();", button)


def main() -> None:
    driver = webdriver.Chrome()
    driver.maximize_window()

    try:
        driver.get(LOGIN_URL)
        time.sleep(3)

        set_ion_input(driver, "ion-input[formcontrolname='email']", EMAIL)
        time.sleep(0.3)
        set_ion_input(driver, "ion-input[formcontrolname='password']", PASSWORD)

        click_ion_button_by_text(driver, "Entrar")
        time.sleep(5)
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
