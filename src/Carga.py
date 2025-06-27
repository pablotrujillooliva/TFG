import sqlite3
import os
from rdflib import Graph, Namespace, Literal, RDF, URIRef
from rdflib.namespace import FOAF, DC, DCTERMS, RDF, RDFS, XSD

# Ruta absoluta a la carpeta data en la raíz del proyecto
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Diccionario ampliado de mapeo exacto
COLUMN_MAP = {
    "name": FOAF.name,
    "first_name": FOAF.name,
    "nombre": FOAF.name,
    "email": FOAF.mbox,
    "correo": FOAF.mbox,
    "mail": FOAF.mbox,
    "description": DC.description,
    "descripcion": DC.description,
    "title": DC.title,
    "titulo": DC.title,
    "created": DCTERMS.created,
    "modified": DCTERMS.modified,
    "last_updated": DCTERMS.modified,
    "birthdate": FOAF.birthday,
    "fecha_nacimiento": FOAF.birthday,
    "homepage": FOAF.homepage,
    "url": FOAF.homepage,
    "website": FOAF.homepage,
    "phone": FOAF.phone,
    "telefono": FOAF.phone,
    "phone": FOAF.phone,
    "nick": FOAF.nick,
    "username": FOAF.nick,
    "apellido": FOAF.familyName,
    "lastname": FOAF.familyName,
    "last_name": FOAF.familyName,
    "givenname": FOAF.givenName,
    "apodo": FOAF.nick,
}

# Función para buscar coincidencias parciales
def get_standard_property(col_name, table_ns):
    safe_col = col_name.replace(" ", "_").lower()
    # Coincidencia exacta
    if safe_col in COLUMN_MAP:
        return COLUMN_MAP[safe_col]
    # Coincidencia parcial
    for key, uri in COLUMN_MAP.items():
        if key in safe_col:
            return uri
    # Si no hay coincidencia, usa el namespace propio
    return table_ns[safe_col]

# 🔹 Archivo del esquema generado previamente
def cargar_datos(esquema_previo, base_datos):
    print("Ejecutando Carga.py")
    esquema_file = esquema_previo

    # 🔹 Cargar el esquema RDF existente
    g = Graph()
    g.parse(esquema_file, format='turtle')
    g.bind("foaf", FOAF)
    g.bind("dc", DC)
    g.bind("dcterms", DCTERMS)
    g.bind("xsd", XSD)
    g.bind("rdfs", RDFS)

    # 🔹 Conectar a la base de datos SQLite
    db_file = base_datos
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # 🔹 Extraer namespaces utilizados en el esquema
    base_ns = Namespace("http://example.org/db#")

    # Función para obtener las tablas de la base de datos
    def get_tables():
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        return [row[0] for row in cursor.fetchall()]

    # Función para obtener las columnas de una tabla
    def get_columns(table_name):
        cursor.execute(f"PRAGMA table_info(\"{table_name}\");")
        return [(col[1], col[2]) for col in cursor.fetchall()]

    # Función para obtener datos de una tabla
    def get_data(table_name):
        cursor.execute(f"SELECT * FROM \"{table_name}\";")
        columns = [desc[0] for desc in cursor.description]
        return columns, cursor.fetchall()

    # 🔹 Obtener las tablas y procesar los datos
    tables = get_tables()
    for table in tables:
        safe_table_name = table.replace(" ", "_")
        table_ns = Namespace(f"http://example.org/db/{safe_table_name}#")
        
        # Obtener los datos de la tabla
        columns, rows = get_data(table)
        
        # Crear instancias RDF para cada fila
        for row in rows:
            # Crear una instancia única para cada fila
            row_id = row[0]  # Se asume que la primera columna es el ID
            instance_uri = URIRef(f"http://example.org/db/{safe_table_name}/{row_id}")
            class_uri = base_ns[safe_table_name]
            g.add((instance_uri, RDF.type, class_uri))
            
            # Añadir propiedades (columnas) con sus valores
            for col_name, value in zip(columns, row):
                prop_uri = get_standard_property(col_name, table_ns)
                
                # Asignar el valor de la propiedad con su tipo adecuado
                if isinstance(value, int):
                    g.add((instance_uri, prop_uri, Literal(value, datatype=XSD.integer)))
                elif isinstance(value, float):
                    g.add((instance_uri, prop_uri, Literal(value, datatype=XSD.float)))
                elif value is None:
                    continue  # Ignorar valores nulos
                else:
                    g.add((instance_uri, prop_uri, Literal(value, datatype=XSD.string)))

    # 🔹 Guardar el RDF con datos en un archivo Turtle
    output_file = os.path.join(DATA_DIR, 'datos_ontologia.ttl')
    g.serialize(destination=output_file, format='turtle')

    print(f"La ontología con datos ha sido generada en '{output_file}'")
    return output_file

if __name__ == "__main__":
    pass
