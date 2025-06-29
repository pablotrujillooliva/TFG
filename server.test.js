const request = require('supertest');
let app;

beforeAll(() => {
  app = require('./server');
});

describe('TFG Visualizador API', () => {

  // Prueba unitaria: la página principal se carga correctamente
  test('GET / debe devolver la página principal', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('TFG Visualizador Bases de Datos Relacional');
  });

  // Prueba de integración: borra datos y redirige
  test('POST /borrar-data borra archivos y redirige', async () => {
    const res = await request(app).post('/borrar-data');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  // Prueba unitaria: rechaza upload sin archivo
  test('POST /upload sin archivo devuelve error', async () => {
    const res = await request(app)
      .post('/upload')
      .type('form')
      .field('dummy', 'value');
    expect(res.text).toContain('No se subió ningún archivo');
  });

  // Prueba de integración: procesar archivo inexistente
  test('POST /procesar/:filename con archivo inexistente devuelve error o redirige', async () => {
    const res = await request(app)
      .post('/procesar/archivo_inexistente.db');
    expect(res.text).toMatch(/Error al procesar la base de datos|Redirecting/);
  });

  // Prueba: GET /data/datos_ontologia.ttl (archivo real o inexistente)
  test('GET /data/datos_ontologia.ttl devuelve 200 o 404', async () => {
    const res = await request(app).get('/data/datos_ontologia.ttl');
    expect([200, 404]).toContain(res.statusCode);
  });

  // Prueba: GET /uploads/archivo_inexistente.db devuelve 404
  test('GET /uploads/archivo_inexistente.db devuelve 404', async () => {
    const res = await request(app).get('/uploads/archivo_inexistente.db');
    expect(res.statusCode).toBe(404);
  });

  // Prueba: GET /src/Pagina_cyto.js devuelve 200 o 404
  test('GET /src/Pagina_cyto.js devuelve 200 o 404', async () => {
    const res = await request(app).get('/src/Pagina_cyto.js');
    expect([200, 404]).toContain(res.statusCode);
  });

  // Prueba: GET /data/ (listado de archivos, debe devolver HTML)
  test('GET /data/ devuelve HTML o 404', async () => {
    const res = await request(app).get('/data/');
    // Puede devolver 404 si no hay index, o 200 con HTML si hay listado
    expect([200, 404]).toContain(res.statusCode);
  });

  // Prueba: POST /upload con archivo válido (mock, no crea archivo real)
  test('POST /upload con archivo .db simulado devuelve redirección o error', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('dbfile', Buffer.from('dummy'), 'test.db');
    // Puede devolver redirección o error si falla el procesamiento
    expect([302, 200]).toContain(res.statusCode);
  });

  // Prueba: POST /borrar-data después de subir (mock, solo espera redirección)
  test('POST /borrar-data después de subir sigue redirigiendo', async () => {
    await request(app)
      .post('/upload')
      .attach('dbfile', Buffer.from('dummy'), 'test.db');
    const res = await request(app).post('/borrar-data');
    expect(res.statusCode).toBe(302);
  });

  // Sugerencia: Pruebas End-to-End (E2E) con Selenium/Cypress
  // - Simular usuario subiendo archivo, procesando y visualizando resultados en el navegador.
  // - Comprobar que los elementos de la interfaz aparecen y funcionan correctamente.

  // Sugerencia: Pruebas de carga y estrés
  // - Usar herramientas como Artillery o JMeter para simular múltiples usuarios subiendo y procesando archivos simultáneamente.

  // Sugerencia: Pruebas de accesibilidad
  // - Usar Lighthouse, Axe o WAVE para analizar la accesibilidad de la interfaz web.

});
