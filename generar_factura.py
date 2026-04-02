from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import time
import os

# Credenciales AFIP
CUIT_USUARIO = '20364363010'
CLAVE_FISCAL = 'Guada379315'  # ⚠️ Cambialo por tu clave real

# Ruta a ChromeDriver
CHROMEDRIVER_PATH = r"C:\Users\carlo\Downloads\chromedriver.exe"
 # o la ruta completa si no está en PATH

def generar_factura_selenium(cuit_cliente, monto, descripcion):
    try:
        options = Options()
        options.add_experimental_option("prefs", {
            "download.default_directory": os.path.expanduser("~/Downloads"),
            "download.prompt_for_download": False,
            "plugins.always_open_pdf_externally": True
        })
        # MODO VISIBLE
        options.add_argument("--start-maximized")
        print("Navegador iniciado correctamente")
        service = Service(CHROMEDRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=options)
        wait = WebDriverWait(driver, 20)
        print("Iniciando navegador...")
        # 1. Ingresar a AFIP
        driver.get("https://auth.afip.gob.ar/contribuyente_/login.xhtml")
        wait.until(EC.presence_of_element_located((By.ID, "F1:username"))).send_keys(CUIT_USUARIO)
        driver.find_element(By.ID, "F1:btnSiguiente").click()
        wait.until(EC.presence_of_element_located((By.ID, "F1:password"))).send_keys(CLAVE_FISCAL)
        driver.find_element(By.ID, "F1:btnIngresar").click()
        print("Página de login cargada")


        #ESCRIBIR COMPROBANTES 
        # 1. Escribir "Comprobantes" en el buscador
        campo_busqueda = wait.until(EC.presence_of_element_located((By.XPATH, "/html/body/div/div/div[2]/section/div/div/div[2]/div/div/div[1]/div/div/div[1]/input")))
        campo_busqueda.clear()
        campo_busqueda.send_keys("Comprobantes")
        time.sleep(2)  # pequeña pausa para que cargue el resultado

        # 2. Hacer clic en el primer resultado
        resultado = wait.until(EC.element_to_be_clickable((By.XPATH, "/html/body/div/div/div[2]/section/div/div/div[2]/div/div/div[1]/div/div/ul/li[1]/a/div/div/div[1]/div/p")))
        resultado.click()

        # 3. Cambiar a la pestaña de "Comprobantes en Línea"
        WebDriverWait(driver, 10).until(lambda d: len(d.window_handles) > 1)
        driver.switch_to.window(driver.window_handles[1])

        
        # 4. click en Nahun Menem
        
        print("Esperando botón MENEM CARLOS NAHUN...")

        try:
            boton = WebDriverWait(driver, 15).until(
                EC.element_to_be_clickable((By.XPATH, "//input[@type='button' and @value='MENEM CARLOS NAHUN']"))

            )
            print("Botón encontrado, haciendo clic...")
            boton.click()
        except Exception as e:
            print("❌ Error haciendo clic en el botón:", e)

        
        elemento = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/table/tbody/tr[1]/td/a/span[2]"))
        )
        elemento.click()
        time.sleep(2)


        # Esperar el <select>
        select_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/form/div/div/table/tbody/tr[1]/td/select"))
        )

        # Crear el objeto Select y elegir la opción por índice (índice 1 = segunda opción)
        Select(select_element).select_by_index(1)
        print("factura c")

        time.sleep(2)
        boton = WebDriverWait(driver, 15).until(
        EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/form/input[2]"))
        )
        boton.click()


        #Conceptos a incluír
        # Esperar el <select> correspondiente
        select_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.XPATH, "/html/body/div[2]/form/div/div/table/tbody/tr[2]/td/select"))
        )

        # Seleccionar por índice (índice 3 = cuarta opción, ya que empieza en 0)
        Select(select_element).select_by_index(3)

        time.sleep(2)
        # Esperar el <select> que contiene esa opción
        select_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div/div/table/tbody/tr[7]/td/table/tbody/tr[2]/td/table/tbody/tr[2]/th/select"
            ))
        )

        # Seleccionar la segunda opción (índice 1)
        Select(select_element).select_by_index(1)


        boton = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/form/input[2]"))
        )
        boton.click()


        # Esperar a que esté presente el <select>
        select_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div/div/table[1]/tbody/tr[1]/td/select"
            ))
        )
        time.sleep(2)    
        # Seleccionar la opción 4 (índice 3 porque empieza en 0)
        Select(select_element).select_by_index(3)


        # Esperar el segundo <select> en la segunda fila de la tabla
        select_element = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div/div/table[1]/tbody/tr[2]/td/select"
            ))
        )

        # Seleccionar la séptima opción (índice 6)
        Select(select_element).select_by_index(6)


        #dni 
        # Esperar el campo de entrada
        input_cuit = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div/div/table[1]/tbody/tr[2]/td/input"
            ))
        )

        # Escribir el CUIT del cliente
        input_cuit.clear()  # limpia si ya hay algo
        input_cuit.send_keys(cuit_cliente)

        # Esperar que el botón esté visible y clickeable
        boton = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/form/div/div/table[2]/tbody/tr[8]/th/input"))
        )

        # Hacer clic
        boton.click()


        # Esperar y hacer clic en el botón de la línea input[2]
        boton = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/form/input[2]"))
        )
        boton.click()

        # Esperar el textarea para la descripción
        campo_descripcion = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div[1]/div/table/tbody/tr[2]/td[2]/textarea"
            ))
        )

        # Escribir el contenido de la variable `descripcion`
        campo_descripcion.clear()
        campo_descripcion.send_keys(descripcion)




                # Esperar el campo de monto
        campo_monto = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((
                By.XPATH,
                "/html/body/div[2]/form/div[1]/div/table/tbody/tr[2]/td[5]/input"
            ))
        )

        # Escribir el monto
        campo_monto.clear()
        campo_monto.send_keys(str(monto))  # Asegura que sea string



        # Esperar que el botón esté visible y clickeable
        boton_continuar = WebDriverWait(driver, 15).until(
            EC.element_to_be_clickable((By.XPATH, "/html/body/div[2]/form/input[8]"))
        )

        # Hacer clic
        boton_continuar.click()

        # 10. PDF generado y descargado automáticamente
        time.sleep(50)
    except Exception as e:
        return f"Error generando factura: {str(e)}"
