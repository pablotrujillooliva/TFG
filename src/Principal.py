# Descripción: Script principal que ejecuta la generación de la estructura RDF a partir de la base de datos Chinook.
import ER as ER
import Dibujo as Dibujo
import Carga as Carga
import TFG.src.GraphDB_transform as GraphDB_transform
import os

# Ruta absoluta a la carpeta data en la raíz del proyecto
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

output_file = os.path.join(DATA_DIR, 'datos_ontologia.ttl')

def main(db_path):
    print("Ejecutando Principal.py")
    base_datos = db_path
    esquema_previo = ER.ejecutar(base_datos)
    dibujo_esquema = Dibujo.dibujar_grafo(base_datos)
    carga_datos = Carga.cargar_datos(esquema_previo, base_datos)
    webVOWL_trans = GraphDB_transform.main(carga_datos, "datos_cargar.json")
    return esquema_previo, dibujo_esquema, carga_datos, webVOWL_trans

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Uso: python Principal.py <ruta_base_de_datos>")
        sys.exit(1)
    db_path = sys.argv[1]
    main(db_path)