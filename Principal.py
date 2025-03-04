# Descripción: Script principal que ejecuta la generación de la estructura RDF a partir de la base de datos Chinook.
import ER
import Dibujo
import Carga

def main(db_path):
    print("Ejecutando Principal.py")
    base_datos = db_path
    esquema_previo = ER.ejecutar(base_datos)
    dibujo_esquema = Dibujo.dibujar_grafo(base_datos)
    carga_datos = Carga.cargar_datos(esquema_previo)
    return esquema_previo, dibujo_esquema, carga_datos

if __name__ == "__main__":
    main()