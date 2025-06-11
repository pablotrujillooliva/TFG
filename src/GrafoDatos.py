import sqlite3
import os
import json
import sys

def generar_grafo_datos(db_path, output_json):
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    os.makedirs(DATA_DIR, exist_ok=True)
    output_path = os.path.join(DATA_DIR, output_json)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    nodes = []
    edges = []

    # Obtener todas las tablas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tablas = [row[0] for row in cursor.fetchall()]

    # Obtener claves primarias y foráneas de cada tabla
    pk_map = {}
    fk_map = {}
    for tabla in tablas:
        cursor.execute(f"PRAGMA table_info('{tabla}')")
        pk_cols = [row[1] for row in cursor.fetchall() if row[5] == 1]
        pk_map[tabla] = pk_cols

        cursor.execute(f"PRAGMA foreign_key_list('{tabla}')")
        fk_map[tabla] = cursor.fetchall()

    # Crear nodos para cada fila
    for tabla in tablas:
        cursor.execute(f"SELECT * FROM {tabla}")
        col_names = [desc[0] for desc in cursor.description]
        for row in cursor.fetchall():
            # Construir id único
            pk_val = "_".join(str(row[col_names.index(pk)]) for pk in pk_map[tabla]) if pk_map[tabla] else str(row[0])
            node_id = f"{tabla}_{pk_val}"
            label = f"{tabla}: " + ", ".join(f"{col}={row[i]}" for i, col in enumerate(col_names))
            nodes.append({"data": {"id": node_id, "label": label}})

    # Crear edges para cada relación foránea
    for tabla in tablas:
        cursor.execute(f"SELECT * FROM {tabla}")
        col_names = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        for fk in fk_map[tabla]:
            # fk: (id, seq, table, from, to, on_update, on_delete, match)
            ref_table = fk[2]
            from_col = fk[3]
            to_col = fk[4]
            for row in rows:
                from_val = row[col_names.index(from_col)]
                # Buscar la fila destino en la tabla referenciada
                cursor.execute(f"SELECT * FROM {ref_table} WHERE {to_col} = ?", (from_val,))
                ref_row = cursor.fetchone()
                if ref_row:
                    # Construir ids
                    pk_val_src = "_".join(str(row[col_names.index(pk)]) for pk in pk_map[tabla]) if pk_map[tabla] else str(row[0])
                    pk_val_dst = "_".join(str(ref_row[i]) for i, col in enumerate(cursor.description) if col[0] in pk_map[ref_table]) if pk_map[ref_table] else str(ref_row[0])
                    src_id = f"{tabla}_{pk_val_src}"
                    dst_id = f"{ref_table}_{pk_val_dst}"
                    edges.append({
                        "data": {
                            "id": f"{src_id}_to_{dst_id}",
                            "source": src_id,
                            "target": dst_id,
                            "label": f"{tabla}.{from_col} → {ref_table}.{to_col}"
                        }
                    })

    grafo = {"elements": nodes + edges}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(grafo, f, indent=2, ensure_ascii=False)
    print(f"Grafo de datos generado en {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python grafo_cytoscape_datos.py <ruta_db> [nombre_salida.json]")
        sys.exit(1)
    db_path = sys.argv[1]
    output_json = sys.argv[2] if len(sys.argv) > 2 else "grafo_datos.json"
    generar_grafo_datos(db_path, output_json)