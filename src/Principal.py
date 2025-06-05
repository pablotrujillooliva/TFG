# Descripción: Script principal que ejecuta la generación de la estructura RDF a partir de la base de datos Chinook.
import ER as ER
import Dibujo as Dibujo
import Carga as Carga
import ttl_transform_webVOWL as ttl_transform_webVOWL

def main(db_path):
    print("Ejecutando Principal.py")
    base_datos = db_path
    esquema_previo = ER.ejecutar(base_datos)
    dibujo_esquema = Dibujo.dibujar_grafo(base_datos)
    carga_datos = Carga.cargar_datos(esquema_previo, base_datos)
    webVOWL_trans = ttl_transform_webVOWL.main(carga_datos, "datos_cargar.json")
    return esquema_previo, dibujo_esquema, carga_datos, webVOWL_trans

if __name__ == "__main__":
    main()