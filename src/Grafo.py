import sqlite3
import os
import json
import sys

def generar_grafo_json(db_path, output_json):
    # Ruta absoluta a la carpeta data
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    os.makedirs(DATA_DIR, exist_ok=True)
    output_path = os.path.join(DATA_DIR, output_json)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Nodos: una por tabla
    nodes = []
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tablas = [row[0] for row in cursor.fetchall()]
    for tabla in tablas:
        nodes.append({"data": {"id": tabla, "label": tabla}})

    # Edges: relaciones por claves foráneas
    edges = []
    for tabla in tablas:
        cursor.execute(f"PRAGMA foreign_key_list('{tabla}')")
        for fk in cursor.fetchall():
            ref_table = fk[2]
            edges.append({
                "data": {
                    "id": f"{tabla}_to_{ref_table}",
                    "source": tabla,
                    "target": ref_table,
                    "label": f"{tabla} → {ref_table}"
                }
            })

    grafo = {"elements": nodes + edges}

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(grafo, f, indent=2, ensure_ascii=False)
    print(f"Grafo generado en {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python Grafo.py <ruta_db> [nombre_salida.json]")
        sys.exit(1)
    db_path = sys.argv[1]
    output_json = sys.argv[2] if len(sys.argv) > 2 else "grafo.json"
    generar_grafo_json(db_path, output_json)