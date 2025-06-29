import unittest
import os
import sqlite3
import json
import sys
import tempfile
import shutil

# Importar los módulos a testear (excepto Pagina_cyto y Principal_GUI)
import src.Carga as Carga
import src.Dibujo as Dibujo
import src.ER as ER
import src.Grafo as Grafo
import src.GrafoDatos as GrafoDatos
import src.GraphDB_transform as GraphDB_transform

class TestTFGScripts(unittest.TestCase):
    def setUp(self):
        # Crear una base de datos temporal para pruebas
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, 'test.db')
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('CREATE TABLE persona (id INTEGER PRIMARY KEY, nombre TEXT, email TEXT)')
        c.execute('INSERT INTO persona (nombre, email) VALUES (?, ?)', ("Juan", "juan@email.com"))
        c.execute('CREATE TABLE libro (id INTEGER PRIMARY KEY, titulo TEXT, persona_id INTEGER, FOREIGN KEY(persona_id) REFERENCES persona(id))')
        c.execute('INSERT INTO libro (titulo, persona_id) VALUES (?, ?)', ("Libro1", 1))
        conn.commit()
        conn.close()
        self.data_dir = os.path.join(self.test_dir, 'data')
        os.makedirs(self.data_dir, exist_ok=True)

    def tearDown(self):
        # Intentar cerrar conexiones SQLite abiertas antes de borrar
        try:
            sqlite3.connect(self.db_path).close()
        except Exception:
            pass
        import gc
        gc.collect()
        shutil.rmtree(self.test_dir)

    def test_grafo(self):
        # Test Grafo.py
        output_json = os.path.join(self.data_dir, 'grafo.json')
        Grafo.generar_grafo_json(self.db_path, output_json)
        self.assertTrue(os.path.exists(output_json))
        with open(output_json, encoding='utf-8') as f:
            data = json.load(f)
        self.assertIn('elements', data)
        self.assertTrue(any(n['data']['id'] == 'persona' for n in data['elements']))

    def test_grafo_datos(self):
        # Test GrafoDatos.py
        output_json = os.path.join(self.data_dir, 'grafo_datos.json')
        GrafoDatos.generar_grafo_datos(self.db_path, output_json)
        self.assertTrue(os.path.exists(output_json))
        with open(output_json, encoding='utf-8') as f:
            data = json.load(f)
        # El resultado debe tener 'elements' (no 'nodes' y 'edges')
        self.assertIn('elements', data)
        self.assertTrue(any('data' in el for el in data['elements']))

    def test_carga_get_standard_property(self):
        # Test de mapeo de columnas en Carga.py
        ns = type('NS', (), {'nombre': 'test_uri'})
        prop = Carga.get_standard_property('nombre', ns)
        self.assertIsNotNone(prop)

    def test_dibujo_get_standard_property(self):
        ns = type('NS', (), {'nombre': 'test_uri'})
        prop = Dibujo.get_standard_property('nombre', ns)
        self.assertIsNotNone(prop)

    def test_er_get_standard_property(self):
        ns = type('NS', (), {'nombre': 'test_uri'})
        prop = ER.get_standard_property('nombre', ns)
        self.assertIsNotNone(prop)

    def test_graphdb_transform(self):
        # Crear un TTL de ejemplo
        ttl_path = os.path.join(self.data_dir, 'test.ttl')
        with open(ttl_path, 'w', encoding='utf-8') as f:
            f.write('@prefix ex: <http://example.org/> .\nex:Juan a ex:Persona .')
        # El script genera el JSON en la carpeta 'data' del proyecto, no en el temporal
        project_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
        os.makedirs(project_data_dir, exist_ok=True)
        json_path = os.path.join(project_data_dir, 'test.json')
        if os.path.exists(json_path):
            os.remove(json_path)
        GraphDB_transform.main(ttl_path, json_path)
        self.assertTrue(os.path.exists(json_path))
        with open(json_path, encoding='utf-8') as f:
            data = json.load(f)
        self.assertIn('class', data)
        # Limpieza del archivo generado
        try:
            os.remove(json_path)
        except Exception:
            pass

if __name__ == '__main__':
    unittest.main()
