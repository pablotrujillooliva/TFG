import sqlite3
from rdflib import Graph, Namespace, Literal, RDF, RDFS, URIRef
from rdflib.namespace import XSD
from graphviz import Digraph  # Para dibujar el grafo

# Conectar a la base de datos 
def dibujar_grafo(base_datos):
    db_file = base_datos # Cambia esto al archivo de tu base de datos
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
        cursor.execute(f"PRAGMA table_info(\"{table_name}\");")
        return [(col[1], col[2]) for col in cursor.fetchall()]

    # Crear el grafo RDF para las tablas y columnas
    tables = get_tables()
    for table in tables:
        # Reemplazar espacios en el nombre de la tabla
        safe_table_name = table.replace(" ", "_")
        table_ns = Namespace(f"http://example.org/db/{safe_table_name}#")
        g.bind(safe_table_name, table_ns)
        
        # Crear una clase para la tabla
        class_uri = base_ns[safe_table_name]
        g.add((class_uri, RDF.type, RDFS.Class))
        g.add((class_uri, RDFS.label, Literal(table)))
        
        # Obtener las columnas de la tabla
        columns = get_columns(table)
        for column_name, column_type in columns:
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

    # Visualizar el grafo RDF utilizando Graphviz
    dot = Digraph(comment='RDF Graph', engine='fdp')

    # Ajustes para hacer el gráfico más cuadrado
    dot.attr(dpi='300', size='10,10', ratio='fill', nodesep='0.3', ranksep='1.0', splines='true', rankdir='TB')

    # Añadir nodos de las tablas (clases)
    for table in tables:
        safe_table_name = table.replace(" ", "_")
        dot.node(safe_table_name, safe_table_name, shape='box', style='filled', color='lightblue')

        # Añadir las columnas como nodos y conectar a las tablas (clases)
        columns = get_columns(table)
        for column_name, _ in columns:
            safe_column_name = column_name.replace(" ", "_")
            dot.node(safe_column_name, safe_column_name, shape='ellipse', style='filled', color='lightgreen')
            dot.edge(safe_table_name, safe_column_name, label=f"hasColumn")

    # Guardar el grafo en un archivo
    output_file = 'rdf_graph_output_square'
    dot.render(output_file, format='png')

    print(f"¡El grafo RDF ha sido generado en '{output_file}.png'!")

if __name__ == "__main__":
    pass