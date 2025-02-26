import sqlite3
import os

from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS, OWL

db_path = os.path.join(os.getcwd(), 'chinook.db')
nombre_archivo = os.path.join(os.getcwd(), 'ontologia.ttl')
conexion = sqlite3.connect(db_path)
cursor = conexion.cursor()


# Crear un grafo RDF
g = Graph()
namespace = Namespace("http://example.org/ontologia/")
g.bind("ex", namespace)

# Obtener todas las tablas de la base de datos
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tablas = [tabla[0] for tabla in cursor.fetchall()]

# Función para convertir nombres en formato URI amigable
def formatear_uri(nombre):
    return nombre.replace(" ", "_").replace(".", "_").lower()

# Procesar cada tabla
for tabla in tablas:
    # Crear una clase OWL para la tabla
    clase_uri = namespace[formatear_uri(tabla)]
    g.add((clase_uri, RDF.type, OWL.Class))
    g.add((clase_uri, RDFS.label, Literal(tabla)))

    # Obtener columnas de la tabla
    cursor.execute(f"PRAGMA table_info({tabla});")
    columnas = cursor.fetchall()

    # Crear propiedades para cada columna
    for columna in columnas:
        nombre_columna = columna[1]
        propiedad_uri = namespace[formatear_uri(nombre_columna)]
        g.add((propiedad_uri, RDF.type, OWL.DatatypeProperty))
        g.add((propiedad_uri, RDFS.label, Literal(nombre_columna)))
        g.add((propiedad_uri, RDFS.domain, clase_uri))
        g.add((propiedad_uri, RDFS.range, RDFS.Literal))

    # Verificar claves foráneas para crear relaciones
    cursor.execute(f"PRAGMA foreign_key_list({tabla});")
    claves_foraneas = cursor.fetchall()

    for clave in claves_foraneas:
        columna_origen = clave[3]
        tabla_destino = clave[2]
        columna_destino = clave[4]

        # Crear una propiedad de objeto para la relación
        relacion_uri = namespace[f"{formatear_uri(tabla)}_{formatear_uri(tabla_destino)}"]
        g.add((relacion_uri, RDF.type, OWL.ObjectProperty))
        g.add((relacion_uri, RDFS.label, Literal(f"{tabla} -> {tabla_destino}")))
        g.add((relacion_uri, RDFS.domain, clase_uri))
        g.add((relacion_uri, RDFS.range, namespace[formatear_uri(tabla_destino)]))

# Guardar la ontología en un archivo Turtle (.ttl)
output_file = nombre_archivo
g.serialize(destination=output_file, format='turtle')
print(f"Ontología generada y guardada en: {output_file}")
print("Contenido:")
print(g.serialize(format="turtle"))

# Cerrar la conexión
conexion.close()