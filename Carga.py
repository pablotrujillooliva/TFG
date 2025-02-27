import sqlite3
from rdflib import Graph, Namespace, Literal, RDF, URIRef
from rdflib.namespace import XSD

    # 🔹 Archivo del esquema generado previamente
def cargar_datos(esquema_previo):
    esquema_file = esquema_previo

    # 🔹 Cargar el esquema RDF existente
    g = Graph()
    g.parse(esquema_file, format='turtle')

    # 🔹 Conectar a la base de datos SQLite
    db_file = r'C:\Users\pablo\Documents\TFG\Proyect\TFG\dbs\chinook.db'
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
                safe_col_name = col_name.replace(" ", "_")
                prop_uri = table_ns[safe_col_name]
                
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
    output_file = 'datos_ontologia.ttl'
    g.serialize(destination=output_file, format='turtle')

    print(f"¡La ontología con datos ha sido generada en '{output_file}'!")
    return output_file

if __name__ == "__main__":
    pass
