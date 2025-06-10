import sqlite3
import os
from rdflib import Graph, Namespace, Literal, RDF, RDFS, OWL, XSD

# === CONFIGURACIÓN ===
# DB_FILE = r'C:\Users\pablo\Documents\TFG\Proyect\TFG\dbs\chinook.db'  # Cambia esto al archivo de tu base de datos


def ejecutar(base_datos):
    print("Ejecutando ER.py")
    DB_FILE = base_datos
    OUTPUT_FILE = 'Estructura.ttl'
    # Namespaces globales
    BASE_NS = Namespace("http://example.org/db#")
    RDF_NS = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
    RDFS_NS = Namespace("http://www.w3.org/2000/01/rdf-schema#")
    OWL_NS = Namespace("http://www.w3.org/2002/07/owl#")
    XSD_NS = Namespace("http://www.w3.org/2001/XMLSchema#")

    # === CONEXIÓN A LA BASE DE DATOS ===
    def connect_to_db(db_file):
        try:
            conn = sqlite3.connect(db_file)
            return conn
        except sqlite3.Error as e:
            print(f"Error al conectar a la base de datos: {e}")
            return None

    # === FUNCIONES PARA OBTENER INFORMACIÓN ===

    # Obtener todas las tablas de la base de datos
    def get_tables(cursor):
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        return [row[0] for row in cursor.fetchall()]

    # Obtener columnas y tipos de datos de una tabla
    def get_columns(cursor, table_name):
        cursor.execute(f"PRAGMA table_info('{table_name}');")
        return [(col[1], col[2]) for col in cursor.fetchall()]

    # Obtener llaves foráneas de una tabla
    def get_foreign_keys(cursor, table_name):
        cursor.execute(f"PRAGMA foreign_key_list('{table_name}');")
        return [(fk[3], fk[2], fk[4]) for fk in cursor.fetchall()]

    # === FUNCIONES PARA GENERAR RDF ===

    # Configurar el grafo RDF con namespaces estándar
    def initialize_graph():
        g = Graph()
        g.bind("db", BASE_NS)
        g.bind("rdf", RDF_NS)
        g.bind("rdfs", RDFS_NS)
        g.bind("owl", OWL_NS)
        g.bind("xsd", XSD_NS)
        return g

    # Crear clases para cada tabla
    def create_classes(g, tables):
        for table in tables:
            class_uri = BASE_NS[table]
            g.add((class_uri, RDF.type, OWL.Class))
            g.add((class_uri, RDFS.label, Literal(table)))
            g.add((class_uri, RDFS.comment, Literal(f"Class representing the '{table}' table")))

    # Crear propiedades de datos para las columnas de una tabla
    def create_data_properties(g, table, columns):
        for column_name, column_type in columns:
            property_uri = BASE_NS[f"{table}_{column_name}"]
            g.add((property_uri, RDF.type, RDF.Property))
            g.add((property_uri, RDFS.label, Literal(column_name)))
            g.add((property_uri, RDFS.domain, BASE_NS[table]))

            # Asignar tipo de datos según el tipo de columna
            if "INT" in column_type.upper():
                g.add((property_uri, RDFS.range, XSD.integer))
            elif "CHAR" in column_type.upper() or "TEXT" in column_type.upper():
                g.add((property_uri, RDFS.range, XSD.string))
            elif "REAL" in column_type.upper() or "FLOAT" in column_type.upper():
                g.add((property_uri, RDFS.range, XSD.float))
            else:
                g.add((property_uri, RDFS.range, XSD.string))

            # Comentarios explicativos
            g.add((property_uri, RDFS.comment, Literal(f"Property for column '{column_name}' in '{table}' table")))

    # Crear relaciones (ObjectProperties) basadas en llaves foráneas
    def create_object_properties(g, table, foreign_keys):
        for fk_column, ref_table, ref_column in foreign_keys:
            object_property_uri = BASE_NS[f"{table}_to_{ref_table}"]
            g.add((object_property_uri, RDF.type, OWL.ObjectProperty))
            g.add((object_property_uri, RDFS.domain, BASE_NS[table]))
            g.add((object_property_uri, RDFS.range, BASE_NS[ref_table]))
            g.add((object_property_uri, RDFS.label, Literal(f"{table} to {ref_table}")))
            g.add((object_property_uri, RDFS.comment, Literal(f"Foreign key from '{table}.{fk_column}' to '{ref_table}.{ref_column}'")))

    # === FUNCIÓN PRINCIPAL ===
    def main():
        # Conectar a la base de datos
        conn = connect_to_db(DB_FILE)
        if not conn:
            return
        cursor = conn.cursor()

        # Crear el grafo RDF
        g = initialize_graph()

        # Obtener las tablas y generar las clases
        tables = get_tables(cursor)
        create_classes(g, tables)

        # Generar propiedades de datos y relaciones para cada tabla
        for table in tables:
            columns = get_columns(cursor, table)
            foreign_keys = get_foreign_keys(cursor, table)
            create_data_properties(g, table, columns)
            create_object_properties(g, table, foreign_keys)

        # Guardar el RDF en un archivo Turtle (.ttl) y lo hace desde la raíz del proyecto
        BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        DATA_DIR = os.path.join(BASE_DIR, 'data')
        os.makedirs(DATA_DIR, exist_ok=True)
        output_file = os.path.join(DATA_DIR, 'Estructura.ttl')
        g.serialize(destination=output_file, format='turtle')
        print(f"Tríplex ontológico generado en '{output_file}' con formato legible")
        return output_file
    
    return main()

# === EJECUCIÓN DEL PROGRAMA ===
if __name__ == "__main__":
    pass
