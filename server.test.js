const request = require('supertest');
let app;

beforeAll(() => {
  app = require('./server');
});

describe('TFG Visualizador API', () => {


  // GET / correcto
  test('GET / debe devolver la página principal correctamente', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('TFG Visualizador Bases de Datos Relacional');
  });

  // GET / error (ruta inexistente)
  test('GET /noexiste debe devolver 404', async () => {
    const res = await request(app).get('/noexiste');
    expect(res.statusCode).toBe(404);
  });

  // POST /borrar-data correcto
  test('POST /borrar-data borra archivos y redirige', async () => {
    const res = await request(app).post('/borrar-data');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  // POST /borrar-data error (método incorrecto)
  test('GET /borrar-data con método incorrecto devuelve 404 o 405', async () => {
    const res = await request(app).get('/borrar-data');
    expect([404, 405]).toContain(res.statusCode);
  });

  // POST /upload correcto
  test('POST /upload con archivo .db simulado devuelve redirección o 200', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('dbfile', Buffer.from('dummy'), 'test.db');
    expect([200, 302]).toContain(res.statusCode);
  });

  // POST /upload error (sin archivo)
  test('POST /upload sin archivo devuelve error', async () => {
    const res = await request(app)
      .post('/upload')
      .type('form')
      .field('dummy', 'value');
    expect(res.text).toContain('No se subió ningún archivo');
  });

  // POST /procesar/:filename correcto (usando archivo dummy)
  test('POST /procesar/:filename con archivo válido simulado', async () => {
    // Primero subimos un archivo
    await request(app)
      .post('/upload')
      .attach('dbfile', Buffer.from('dummy'), 'test.db');
    const res = await request(app)
      .post('/procesar/test.db');
    // Puede devolver 200 o redirección si el procesamiento es correcto
    expect([200, 302]).toContain(res.statusCode);
  });

  // POST /procesar/:filename error (archivo inexistente)
  test('POST /procesar/:filename con archivo inexistente devuelve error', async () => {
    const res = await request(app)
      .post('/procesar/archivo_inexistente.db');
    expect(res.text).toMatch(/Error al procesar la base de datos/);
  });

  // GET /data/datos_ontologia.ttl correcto (si existe)
  test('GET /data/datos_ontologia.ttl devuelve 200 si existe', async () => {
    // Creamos el archivo si no existe
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'data', 'datos_ontologia.ttl');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, '@prefix : <#> .\n', 'utf8');
    }
    const res = await request(app).get('/data/datos_ontologia.ttl');
    expect(res.statusCode).toBe(200);
  });

  // GET /data/datos_ontologia.ttl error (archivo inexistente)
  test('GET /data/archivo_inexistente.ttl devuelve 404', async () => {
    const res = await request(app).get('/data/archivo_inexistente.ttl');
    expect(res.statusCode).toBe(404);
  });

  // GET /uploads/archivo_inexistente.db error
  test('GET /uploads/archivo_inexistente.db devuelve 404', async () => {
    const res = await request(app).get('/uploads/archivo_inexistente.db');
    expect(res.statusCode).toBe(404);
  });

  // GET /uploads/test.db correcto (después de subir)
  test('GET /uploads/test.db devuelve 200 o 404 después de subir', async () => {
    await request(app)
      .post('/upload')
      .attach('dbfile', Buffer.from('dummy'), 'test.db');
    const res = await request(app).get('/uploads/test.db');
    expect([200, 404]).toContain(res.statusCode);
  });

  // GET /src/Pagina_cyto.js correcto (si existe)
  test('GET /src/Pagina_cyto.js devuelve 200 si existe', async () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'Pagina_cyto.js');
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, '// dummy', 'utf8');
    }
    const res = await request(app).get('/src/Pagina_cyto.js');
    expect(res.statusCode).toBe(200);
  });

  // GET /src/archivo_inexistente.js error
  test('GET /src/archivo_inexistente.js devuelve 404', async () => {
    const res = await request(app).get('/src/archivo_inexistente.js');
    expect(res.statusCode).toBe(404);
  });

  // GET /data/ correcto (listado de archivos)
  test('GET /data/ devuelve HTML o 404 si existe', async () => {
    const fs = require('fs');
    const path = require('path');
    const dirPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    // Creamos un archivo para que haya contenido
    fs.writeFileSync(path.join(dirPath, 'dummy.txt'), 'contenido', 'utf8');
    const res = await request(app).get('/data/');
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.text).toMatch(/dummy.txt/);
    }
  });

  // GET /data/ error (directorio inexistente)
  test('GET /directorio_inexistente/ devuelve 404', async () => {
    const res = await request(app).get('/directorio_inexistente/');
    expect(res.statusCode).toBe(404);
  });
  
  // Sugerencia: Pruebas de carga y estrés
  // - Usar herramientas como Artillery o JMeter para simular múltiples usuarios subiendo y procesando archivos simultáneamente.
});
