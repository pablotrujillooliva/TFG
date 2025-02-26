import sqlite3
import os

from rdflib import Graph, Namespace, URIRef, Literal, RDF, RDFS, OWL

db_path = os.path.join(os.getcwd(), 'chinook.db')
nombre_archivo = os.path.join(os.getcwd(), 'ontologia.ttl')
conexion = sqlite3.connect(db_path)
cursor = conexion.cursor()


cursor = conexion.cursor()

# Crear un grafo RDF
g = Graph()

# Definir el espacio de nombres
namespace = URIRef("http://example.org/")

# Consultar las tablas en la base de datos
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tablas = cursor.fetchall()

# Iterar sobre todas las tablas
for tabla in tablas:
    tabla_nombre = tabla[0]

    # Definir una clase para cada tabla
    clase = URIRef(namespace + tabla_nombre)
    g.add((clase, RDF.type, RDFS.Class))

    # Obtener las columnas de la tabla (información sobre el esquema)
    cursor.execute(f"PRAGMA table_info({tabla_nombre});")
    columnas = cursor.fetchall()

    # Definir las propiedades para cada columna
    for columna in columnas:
        columna_nombre = columna[1]  # El nombre de la columna
        propiedad = URIRef(namespace + columna_nombre)

        # Agregar la propiedad al grafo RDF
        g.add((propiedad, RDF.type, RDF.Property))
        g.add((propiedad, RDFS.domain, clase))  # Relacionamos la propiedad con la clase
        g.add((propiedad, RDFS.range, RDFS.Literal))  # Tipo de los valores es literal (puedes hacer ajustes si tienes otros tipos)

    # Obtener los datos de la tabla y agregar las instancias (filas) al grafo
    cursor.execute(f"SELECT * FROM {tabla_nombre}")
    filas = cursor.fetchall()

    for fila in filas:
        # Crear una URI única para la instancia (usando el nombre de la tabla y el id de la fila, si existe)
        instancia_uri = URIRef(namespace + f"{tabla_nombre}/{fila[0]}")  # Usamos el primer valor de la fila como ID si existe
        g.add((instancia_uri, RDF.type, clase))

        # Agregar las propiedades y valores de la fila
        for i, columna in enumerate(columnas):
            columna_nombre = columna[1]
            valor = fila[i]
            if valor is not None:
                g.add((instancia_uri, URIRef(namespace + columna_nombre), Literal(valor)))

# Guardar la ontología RDF en un archivo Turtle y lo imprime
output_file = nombre_archivo
g.serialize(destination=output_file, format='turtle')
print(f"Ontología generada y guardada en: {output_file}")
print("Contenido:")
print(g.serialize(format="turtle"))

# Cerrar la conexión a la base de datos
conexion.close()