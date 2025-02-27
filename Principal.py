# Descripción: Script principal que ejecuta la generación de la estructura RDF a partir de la base de datos Chinook.
import ER
import Dibujo
import Carga
from rdflib import Graph, Namespace, Literal, RDF, RDFS, XSD
from rdflib.namespace import OWL

# === CONFIGURACIÓN ===
base_datos = r'C:\Users\pablo\Documents\TFG\Proyect\TFG\dbs\chinook.db'
OUTPUT_ER = 'Estructura.ttl'



def main():
    esquema_previo = ER.ejecutar(base_datos)
    dibujo_esquema = Dibujo.dibujar_grafo(base_datos)
    carga_datos = Carga.cargar_datos(esquema_previo)
    print(f"Archivo de salida RDF: {esquema_previo}")
    print(f"Archivo de salida del grafo: {dibujo_esquema}")
    print(f"Datos cargados en el esquema RDF: {carga_datos}")

if __name__ == "__main__":
    main()