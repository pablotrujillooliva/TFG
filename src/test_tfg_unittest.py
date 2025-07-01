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
    def test_carga_columnas_tabla_inexistente(self):
        # Prueba get_columnas_tabla con una tabla que no existe
        if hasattr(Carga, 'get_columnas_tabla'):
            with self.assertRaises(Exception):
                Carga.get_columnas_tabla('tabla_inexistente', self.db_path)

    def test_dibujo_columnas_tabla_inexistente(self):
        # Prueba get_columnas_tabla con una tabla que no existe en Dibujo.py
        if hasattr(Dibujo, 'get_columnas_tabla'):
            with self.assertRaises(Exception):
                Dibujo.get_columnas_tabla('tabla_inexistente', self.db_path)

    def test_er_columnas_tabla_inexistente(self):
        # Prueba get_columnas_tabla con una tabla que no existe en ER.py
        if hasattr(ER, 'get_columnas_tabla'):
            with self.assertRaises(Exception):
                ER.get_columnas_tabla('tabla_inexistente', self.db_path)

    def test_carga_leer_datos_tabla_inexistente(self):
        # Prueba leer_datos_tabla con una tabla que no existe
        if hasattr(Carga, 'leer_datos_tabla'):
            with self.assertRaises(Exception):
                Carga.leer_datos_tabla('tabla_inexistente', self.db_path)

    def test_grafo_json_invalido(self):
        # Prueba que Grafo.generar_grafo_json lanza excepción si el archivo no es una base de datos
        output_json = os.path.join(self.data_dir, 'grafo.json')
        with open(self.db_path, 'w') as f:
            f.write('no es una base de datos')
        with self.assertRaises(Exception):
            Grafo.generar_grafo_json(self.db_path, output_json)

    def test_graphdb_transform_ttl_invalido(self):
        # Prueba que GraphDB_transform.main lanza excepción si el TTL es inválido
        ttl_path = os.path.join(self.data_dir, 'invalido.ttl')
        with open(ttl_path, 'w', encoding='utf-8') as f:
            f.write('esto no es un TTL válido')
        json_path = os.path.join(self.data_dir, 'invalido.json')
        with self.assertRaises(Exception):
            GraphDB_transform.main(ttl_path, json_path)
    def test_carga_cargar_datos(self):
        # Prueba la función cargar_datos de Carga.py
        # Crea un esquema turtle mínimo
        esquema_path = os.path.join(self.data_dir, 'esquema.ttl')
        with open(esquema_path, 'w', encoding='utf-8') as f:
            f.write('@prefix ex: <http://example.org/db#> .\nex:persona a ex:Tabla .')
        # Ejecuta cargar_datos
        if hasattr(Carga, 'cargar_datos'):
            salida = Carga.cargar_datos(esquema_path, self.db_path)
            self.assertTrue(os.path.exists(salida))

    def test_dibujo_dibujar_grafo(self):
        # Prueba la función dibujar_grafo de Dibujo.py
        if hasattr(Dibujo, 'dibujar_grafo'):
            Dibujo.dibujar_grafo(self.db_path)
            # Comprueba que el archivo de salida existe
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            data_dir = os.path.join(base_dir, 'data')
            png_path = os.path.join(data_dir, 'rdf_graph_output_square.png')
            self.assertTrue(os.path.exists(png_path))

    def test_er_ejecutar(self):
        # Prueba la función ejecutar de ER.py
        if hasattr(ER, 'ejecutar'):
            salida = ER.ejecutar(self.db_path)
            # La función devuelve una función main, así que la ejecutamos
            if callable(salida):
                out_file = salida()
                self.assertTrue(os.path.exists(out_file))
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

    def test_carga_funciones_varias(self):
        # Prueba funciones adicionales de Carga.py
        # get_standard_property ya está testeada, probamos otras si existen
        if hasattr(Carga, 'get_columnas_tabla'):
            cols = Carga.get_columnas_tabla('persona', self.db_path)
            self.assertIn('nombre', cols)
        if hasattr(Carga, 'get_tablas'):
            tablas = Carga.get_tablas(self.db_path)
            self.assertIn('persona', tablas)
        if hasattr(Carga, 'leer_datos_tabla'):
            datos = Carga.leer_datos_tabla('persona', self.db_path)
            self.assertTrue(any('nombre' in d for d in datos))

    def test_dibujo_funciones_varias(self):
        # Prueba funciones adicionales de Dibujo.py
        ns = type('NS', (), {'nombre': 'test_uri'})
        if hasattr(Dibujo, 'get_standard_property'):
            prop = Dibujo.get_standard_property('nombre', ns)
            self.assertIsNotNone(prop)
        if hasattr(Dibujo, 'get_columnas_tabla'):
            cols = Dibujo.get_columnas_tabla('persona', self.db_path)
            self.assertIn('nombre', cols)
        if hasattr(Dibujo, 'get_tablas'):
            tablas = Dibujo.get_tablas(self.db_path)
            self.assertIn('persona', tablas)

    def test_er_funciones_varias(self):
        # Prueba funciones adicionales de ER.py
        ns = type('NS', (), {'nombre': 'test_uri'})
        if hasattr(ER, 'get_standard_property'):
            prop = ER.get_standard_property('nombre', ns)
            self.assertIsNotNone(prop)
        if hasattr(ER, 'get_columnas_tabla'):
            cols = ER.get_columnas_tabla('persona', self.db_path)
            self.assertIn('nombre', cols)
        if hasattr(ER, 'get_tablas'):
            tablas = ER.get_tablas(self.db_path)
            self.assertIn('persona', tablas)

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
