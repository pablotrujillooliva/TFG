import sqlite3
import os
from rdflib import Graph, Namespace, Literal, RDF, RDFS, URIRef
from rdflib.namespace import FOAF, DC, DCTERMS, XSD, RDFS
from graphviz import Digraph  # Para dibujar el grafo

# Ruta absoluta a la carpeta data en la raíz del proyecto
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Diccionario ampliado de mapeo exacto (igual que en Carga.py)
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
    "nick": FOAF.nick,
    "username": FOAF.nick,
    "apellido": FOAF.familyName,
    "lastname": FOAF.familyName,
    "last_name": FOAF.familyName,
    "givenname": FOAF.givenName,
    "apodo": FOAF.nick,
}

def get_standard_property(col_name, table_ns):
    safe_col = col_name.replace(" ", "_").lower()
    if safe_col in COLUMN_MAP:
        return COLUMN_MAP[safe_col]
    for key, uri in COLUMN_MAP.items():
        if key in safe_col:
            return uri
    return table_ns[safe_col]

# Función para obtener el prefijo y el nombre local
def get_prefixed_label(graph, uri):
    try:
        prefix, namespace, name = graph.compute_qname(uri)
        return f"{prefix}:{name}"
    except Exception:
        return str(uri)

# Conectar a la base de datos 
def dibujar_grafo(base_datos):
    print("Iniciando la generación del grafo RDF...")
    db_file = base_datos
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # Crear el grafo RDF
    g = Graph()

    # Namespace general para la base de datos
    base_ns = Namespace("http://example.org/db#")
    g.bind("db", base_ns)
    g.bind("foaf", FOAF)
    g.bind("dc", DC)
    g.bind("dcterms", DCTERMS)
    g.bind("xsd", XSD)
    g.bind("rdfs", RDFS)

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
            property_uri = get_standard_property(column_name, table_ns)
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
    dot.attr(dpi='300', size='10,10', ratio='fill', nodesep='0.3', ranksep='1.0', splines='true', rankdir='TB')

    # Añadir nodos de las tablas (clases)
    for table in tables:
        safe_table_name = table.replace(" ", "_")
        dot.node(safe_table_name, safe_table_name, shape='box', style='filled', color='lightblue')

        # Añadir las columnas como nodos y conectar a las tablas (clases)
        columns = get_columns(table)
        table_ns = Namespace(f"http://example.org/db/{safe_table_name}#")
        for column_name, _ in columns:
            safe_column_name = column_name.replace(" ", "_")
            property_uri = get_standard_property(column_name, table_ns)
            label = get_prefixed_label(g, property_uri)
            dot.node(safe_column_name, safe_column_name, shape='ellipse', style='filled', color='lightgreen')
            dot.edge(safe_table_name, safe_column_name, label=label)

    # Guardar el grafo en un archivo
    output_file = os.path.join(DATA_DIR, 'rdf_graph_output_square')
    dot.render(output_file, format='png')

    print(f"El grafo RDF ha sido generado en '{output_file}.png'")

if __name__ == "__main__":
    pass