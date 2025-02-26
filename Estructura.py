import sqlite3
from rdflib import Graph, Namespace, Literal, RDF, RDFS, URIRef
from rdflib.namespace import XSD

# Nombre del archivo de la base de datos SQLite (en la misma carpeta)
db_file = 'chinook.db'  # ¡Cámbialo al nombre de tu archivo!

# Conectar a la base de datos
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Crear el grafo RDF
g = Graph()

# Namespace general para la base de datos
base_ns = Namespace("http://example.org/db#")
g.bind("db", base_ns)

# Prefijos estándar
rdf_ns = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
rdfs_ns = Namespace("http://www.w3.org/2000/01/rdf-schema#")
xsd_ns = Namespace("http://www.w3.org/2001/XMLSchema#")

g.bind("rdf", rdf_ns)
g.bind("rdfs", rdfs_ns)
g.bind("xsd", xsd_ns)

# Función para obtener las tablas de la base de datos
def get_tables():
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    return [row[0] for row in cursor.fetchall()]

# Función para obtener las columnas de una tabla
def get_columns(table_name):
    # Añadir comillas alrededor del nombre de la tabla para manejar espacios
    cursor.execute(f"PRAGMA table_info(\"{table_name}\");")
    return [(col[1], col[2]) for col in cursor.fetchall()]  # (nombre, tipo)

# Generar RDF para cada tabla y sus columnas
tables = get_tables()
for table in tables:
    # Reemplazar espacios en el nombre de la tabla para el prefijo
    safe_table_name = table.replace(" ", "_")  # Reemplazar espacios por guiones bajos
    table_ns = Namespace(f"http://example.org/db/{safe_table_name}#")
    g.bind(safe_table_name, table_ns)
    
    # Crear una clase para la tabla
    class_uri = base_ns[safe_table_name]
    g.add((class_uri, RDF.type, RDFS.Class))
    g.add((class_uri, RDFS.label, Literal(table)))
    g.add((class_uri, RDFS.comment, Literal(f"Tabla '{table}' de la base de datos '{db_file}'.")))

    # Obtener las columnas de la tabla
    columns = get_columns(table)
    for column_name, column_type in columns:
        # Reemplazar espacios en el nombre de la columna para el prefijo
        safe_column_name = column_name.replace(" ", "_")
        property_uri = table_ns[safe_column_name]
        
        g.add((property_uri, RDF.type, RDF.Property))
        g.add((property_uri, RDFS.label, Literal(column_name)))
        g.add((property_uri, RDFS.domain, class_uri))
        
        # Asignar el tipo de datos según el tipo de columna en SQLite
        if "INT" in column_type.upper():
            g.add((property_uri, RDFS.range, XSD.integer))
        elif "CHAR" in column_type.upper() or "TEXT" in column_type.upper():
            g.add((property_uri, RDFS.range, XSD.string))
        elif "REAL" in column_type.upper() or "FLOAT" in column_type.upper():
            g.add((property_uri, RDFS.range, XSD.float))
        else:
            g.add((property_uri, RDFS.range, XSD.string))  # Tipo por defecto

# Guardar el grafo en un archivo Turtle
output_file = f"{db_file.split('.')[0]}.ttl"
g.serialize(output_file, format="turtle")

print(f"¡RDF generado exitosamente en '{output_file}'!")
print("Contenido:")
print(g.serialize(format="turtle"))