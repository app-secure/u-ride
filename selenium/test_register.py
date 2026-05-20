from selenium import webdriver
from selenium.webdriver.common.by import By
import time


BASE_URL = "http://localhost:4200"
REGISTER_URL = f"{BASE_URL}/auth/register"


def set_ion_input(driver, css_selector, value):
    ion_input = driver.find_element(By.CSS_SELECTOR, css_selector)
    try:
        native = ion_input.shadow_root.find_element(By.CSS_SELECTOR, "input")
    except Exception:
        native = ion_input.find_element(By.CSS_SELECTOR, "input")
    driver.execute_script("arguments[0].value = '';", native)
    native.send_keys(value)


def main() -> None:
    driver = webdriver.Chrome()
    driver.maximize_window()

    try:
        driver.get(REGISTER_URL)
        time.sleep(1)

        password = "Manuelr@mirez21"

        set_ion_input(driver, "ion-input[formcontrolname='firstName']", "Manuel")
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='lastName']", "Ramírez")
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='email']", "mramirez1561@uta.edu.ec")
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='password']", password)
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='password2']", password)
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='career']", "Ingenieria de Software")
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='phone']", "0999999999")
        time.sleep(0.5)
        set_ion_input(driver, "ion-input[formcontrolname='zone']", "Ambato")
        time.sleep(0.5)

        terms = driver.find_element(By.CSS_SELECTOR, "ion-checkbox.terms-checkbox")
        driver.execute_script("arguments[0].click();", terms)
        time.sleep(0.5)

        crear = driver.find_element(By.XPATH, "//ion-button[contains(normalize-space(.), 'Crear cuenta')]")
        driver.execute_script("arguments[0].click();", crear)
        time.sleep(5)
        time.sleep(45)
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
