const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SRC_DIR = path.join(__dirname, 'src');

// Asegúrate de que las carpetas existen
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// Configuración de Multer para subir archivos .db
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Servir archivos estáticos (imágenes, ttl, json, uploads)
app.use('/webvowl', express.static(path.join(__dirname, '/webvowl')));
app.use('/data', express.static(DATA_DIR));
app.use('/src', express.static(SRC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Página principal con formulario de subida
app.get('/', (req, res) => {
    const ttlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ttl'));
    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const images = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.png'));
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);

    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TFG Data Viewer</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      background: #f4f6fa;
      font-family: 'Roboto', Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #222;
    }
    a:focus, button:focus, input:focus, select:focus {
      outline: 3px solid #005fa3;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px #cce6ff;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      border: 0;
    }
    .skip-link {
      position: absolute;
      left: -999px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: 1000;
      background: #005fa3;
      color: #fff;
      padding: 0.5em 1em;
      border-radius: 5px;
    }
    .skip-link:focus {
      left: 10px;
      top: 10px;
      width: auto;
      height: auto;
      font-size: 1.1em;
      outline: 3px solid #f1c40f;
    }
    header {
      background: linear-gradient(90deg, #003366 0%, #005fa3 100%);
      color: #fff;
      padding: 2rem 1rem 1rem 1rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5em 0;
      font-weight: 700;
      letter-spacing: 2px;
    }
    main {
      max-width: 1100px;
      margin: 2rem auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
      padding: 2rem 2.5rem 2.5rem 2.5rem;
    }
    section {
      margin-bottom: 2.5rem;
    }
    h2 {
      color: #005fa3;
      font-size: 1.4rem;
      margin-bottom: 0.7em;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 0.2em;
    }
    ul.file-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1em 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.7em 1.5em;
    }
    ul.file-list li {
      background: #f0f4f8;
      border-radius: 6px;
      padding: 0.4em 1em;
      font-size: 1em;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      transition: background 0.2s;
    }
    ul.file-list li:hover {
      background: #e3eaf2;
    }
    a {
      color: #003366;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    .btn {
      border: none;
      border-radius: 5px;
      padding: 0.5em 1.2em;
      font-size: 1em;
      font-family: inherit;
      cursor: pointer;
      margin: 0.2em 0.5em 0.2em 0;
      transition: background 0.2s, color 0.2s;
    }
    .btn-danger {
      background: #c0392b;
      color: #fff;
    }
    .btn-danger:hover {
      background: #a93226;
    }
    .btn-success {
      background: #27ae60;
      color: #fff;
    }
    .btn-success:hover {
      background: #219150;
    }
    .btn-warning {
      background: #f1c40f;
      color: #fff;
    }
    .btn-warning:hover {
      background: #d4ac0d;
    }
    .btn-primary {
      background: #005fa3;
      color: #fff;
    }
    .btn-primary:hover {
      background: #003366;
    }
    form.inline {
      display: inline;
    }
    .cyto-panel {
      background: #f8fafc;
      border-radius: 8px;
      padding: 1.5em 1em 1em 1em;
      margin-top: 1.5em;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    label {
      font-weight: 500;
      margin-right: 0.5em;
    }
    select, input[type="text"] {
      border-radius: 4px;
      border: 1px solid #bfc9d1;
      padding: 0.3em 0.7em;
      font-size: 1em;
      margin-right: 0.7em;
      margin-bottom: 0.5em;
    }
    #cy {
      width: 100%;
      height: 600px;
      border: 1px solid #bfc9d1;
      background: #fff;
      border-radius: 8px;
      margin-top: 1em;
    }
    #info {
      white-space: pre;
      margin-top: 1em;
      background: #f4f6fa;
      border: 1px solid #bfc9d1;
      padding: 10px;
      border-radius: 6px;
    }
    @media (max-width: 700px) {
      main { padding: 1em; }
      .cyto-panel { padding: 1em 0.2em; }
      #cy { height: 350px; }
    }
  </style>

    <body>
      <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
      <header>
        <h1>TFG Visualizador Bases de Datos Relacional</h1>
        <p style="font-size:1.1em; font-weight:400; margin:0;">Visualiza, transforma y explora tus bases de datos de forma intuitiva</p>
      </header>
      <main id="main-content" tabindex="-1">
        <section style="display:flex; gap:2em; flex-wrap:wrap; align-items:center;">
          <form action="/borrar-data" method="post" onsubmit="return confirm('¿Seguro que quieres borrar TODOS los archivos de data?');">
            <button type="submit" class="btn btn-danger" accesskey="b">Borrar archivos</button>
          </form>
          <form action="/upload" method="post" enctype="multipart/form-data" style="display:flex; align-items:center; gap:1em;">
            <label for="dbfile" style="margin:0;">Sube tu base de datos (.db):</label>
            <input type="file" id="dbfile" name="dbfile" accept=".db" required aria-describedby="dbfile-desc">
            <span id="dbfile-desc" class="visually-hidden">Selecciona un archivo de base de datos SQLite con extensión .db</span>
            <button type="submit" class="btn btn-success" accesskey="u">Subir y transformar</button>
          </form>
        </section>
        <section>
          <h2>Archivos TTL</h2>
          <ul class="file-list">
            ${ttlFiles.map(f => `<li><a href="/data/${f}" target="_blank" aria-label="Ver archivo TTL ${f}">${f}</a> <a href="/data/${f}" download class="btn btn-primary" style="margin-left:0.3em; padding:0.2em 0.7em; font-size:0.9em;" aria-label="Descargar archivo TTL ${f}"><span aria-hidden="true">⬇</span><span class="visually-hidden">Descargar</span></a></li>`).join('')}
          </ul>
          <h2>Archivos JSON</h2>
          <ul class="file-list">
            ${jsonFiles.map(f => `<li><a href="/data/${f}" target="_blank" aria-label="Ver archivo JSON ${f}">${f}</a> <a href="/data/${f}" download class="btn btn-primary" style="margin-left:0.3em; padding:0.2em 0.7em; font-size:0.9em;" aria-label="Descargar archivo JSON ${f}"><span aria-hidden="true">⬇</span><span class="visually-hidden">Descargar</span></a></li>`).join('')}
          </ul>
          <h2>Imágenes</h2>
          <ul class="file-list">
            ${images.map(f => `<li><a href="/data/${f}" target="_blank" aria-label="Ver imagen ${f}">${f}</a> <a href="/data/${f}" download class="btn btn-primary" style="margin-left:0.3em; padding:0.2em 0.7em; font-size:0.9em;" aria-label="Descargar imagen ${f}"><span aria-hidden="true">⬇</span><span class="visually-hidden">Descargar</span></a></li>`).join('')}
          </ul>
        </section>
        <section>
          <h2>Uploads realizados</h2>
          <ul class="file-list">
            ${uploadFiles.map(f => `
              <li>
                <a href="/uploads/${f}" target="_blank" download aria-label="Descargar base de datos subida ${f}">${f}</a>
                <form action="/procesar/${encodeURIComponent(f)}" method="post" class="inline">
                  <button type="submit" class="btn btn-warning" accesskey="p">Procesar</button>
                </form>
              </li>
            `).join('')}
          </ul>
        </section>
        <section class="cyto-panel">
          <h2>Visualización interactiva (Cytoscape.js)</h2>
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:1em;">
            <label for="grafoSelect">Selecciona el grafo:</label>
            <select id="grafoSelect">
              ${jsonFiles.map(f => `<option value="${f}">${f}</option>`).join('')}
            </select>
            <label for="tablaSelect">Selecciona la tabla a visualizar:</label>
            <select id="tablaSelect"></select>
            <label for="columnaFiltro">Filtrar por columna:</label>
            <select id="columnaFiltro"></select>
            <input type="text" id="elementoFiltro" placeholder="Buscar elemento...">
            <button id="btnBuscarElemento" class="btn btn-primary" accesskey="f">Buscar</button>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5em; max-width: 100vw; overflow-x: hidden; margin-top:1em;">
            <label for="elementoSelect">Selecciona el elemento:</label>
            <select id="elementoSelect" style="min-width: 350px; min-height: 3em; font-size: 0.9em; white-space: normal; line-height: 1.3;"></select>
            <button id="btnVerElemento" class="btn btn-warning" accesskey="r">Ver relacionados</button>
            <button id="btnExpandirNodo" class="btn btn-warning" accesskey="e">Expandir nodo</button>
          </div>
          <div id="cy" tabindex="0" aria-label="Visualización de grafo"></div>
          <div id="info" tabindex="0" aria-live="polite"></div>
        </section>
        <div id="error-message" role="alert" aria-live="assertive" style="color:#c0392b; margin-top:1em;"></div>
      </main>
      <script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
      <script src="/src/Pagina_cyto.js"></script>
      <script>
        // Mejorar accesibilidad: mover foco al main al usar skip-link
        document.querySelector('.skip-link').addEventListener('click', function(e) {
          setTimeout(function() {
            var main = document.getElementById('main-content');
            if(main) main.focus();
          }, 100);
        });
        // Mostrar mensajes de error accesibles si existen en la URL
        const params = new URLSearchParams(window.location.search);
        if(params.has('error')) {
          const msg = decodeURIComponent(params.get('error'));
          const errorDiv = document.getElementById('error-message');
          if(errorDiv) errorDiv.textContent = msg;
        }
      </script>
    </body>
    </html>
`;

    res.send(html);
});

// Ruta para subir y transformar la base de datos
app.post('/upload', upload.single('dbfile'), (req, res) => {
    if (!req.file) {
        return res.send('No se subió ningún archivo.');
    }
    const dbPath = path.resolve(req.file.path);

    // Nombres únicos para los archivos de salida
    const dbBase = path.basename(dbPath, path.extname(dbPath));
    const grafoJson = `grafo_${dbBase}.json`;
    const grafoDatosJson = `grafo_datos_${dbBase}.json`;

    // Ejecuta Principal.py, Grafo.py y GrafoDatos.py en orden
    exec(`python "${path.join(SRC_DIR, 'Principal.py')}" "${dbPath}"`, { cwd: SRC_DIR }, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error) {
            // Siempre redirige aunque haya error, mostrando el error en la página principal
            return res.redirect('/?error=' + encodeURIComponent('Error al procesar la base de datos. ' + stderr));
        }
        // Ejecuta Grafo.py
        exec(`python "${path.join(SRC_DIR, 'Grafo.py')}" "${dbPath}" "${grafoJson}"`, { cwd: SRC_DIR }, (error2, stdout2, stderr2) => {
            console.log(stdout2);
            console.error(stderr2);
            if (error2) {
                return res.redirect('/?error=' + encodeURIComponent('Error al generar grafo.json. ' + stderr2));
            }
            // Ejecuta GrafoDatos.py
            exec(`python "${path.join(SRC_DIR, 'GrafoDatos.py')}" "${dbPath}" "${grafoDatosJson}"`, { cwd: SRC_DIR }, (error3, stdout3, stderr3) => {
                console.log(stdout3);
                console.error(stderr3);
                if (error3) {
                    return res.redirect('/?error=' + encodeURIComponent('Error al generar grafo_datos.json. ' + stderr3));
                }
                res.redirect('/');
            });
        });
    });
});

app.post('/procesar/:filename', (req, res) => {
    const dbFile = req.params.filename;
    const dbPath = path.join(UPLOADS_DIR, dbFile);

    // Si el archivo no existe, responde con error inmediatamente
    if (!fs.existsSync(dbPath)) {
        return res.send('Error al procesar la base de datos.<br>Archivo no encontrado.');
    }

    const dbBase = path.basename(dbPath, path.extname(dbPath));
    const grafoJson = `grafo_${dbBase}.json`;
    const grafoDatosJson = `grafo_datos_${dbBase}.json`;

    exec(`python "${path.join('src', 'Principal.py')}" "${dbPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error) {
            return res.send('Error al procesar la base de datos.<br>' + stderr);
        }
        exec(`python "${path.join('src', 'Grafo.py')}" "${dbPath}" "${grafoJson}"`, { cwd: __dirname }, (error2, stdout2, stderr2) => {
            console.log(stdout2);
            console.error(stderr2);
            if (error2) {
                return res.send('Error al generar grafo.json.<br>' + stderr2);
            }
            exec(`python "${path.join('src', 'GrafoDatos.py')}" "${dbPath}" "${grafoDatosJson}"`, { cwd: __dirname }, (error3, stdout3, stderr3) => {
                console.log(stdout3);
                console.error(stderr3);
                if (error3) {
                    return res.send('Error al generar grafo_datos.json.<br>' + stderr3);
                }
                res.redirect('/');
            });
        });
    });
});


// Solo permite POST en /borrar-data, cualquier otro método devuelve 405 Method Not Allowed
app.all('/borrar-data', (req, res, next) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }
  next();
});

app.post('/borrar-data', (req, res) => {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(f => {
        fs.unlinkSync(path.join(DATA_DIR, f));
    });
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);
    uploadFiles.forEach(f => {
        fs.unlinkSync(path.join(UPLOADS_DIR, f));
    });
    res.redirect('/');
});

// Ruta para mostrar un listado HTML de los archivos en la carpeta /data/
// Esto permite que GET /data/ devuelva un listado simple de archivos, útil para tests y depuración
app.get('/data/', (req, res) => {
  const files = fs.readdirSync(DATA_DIR);
  res.send('<ul>' + files.map(f => `<li>${f}</li>`).join('') + '</ul>');
});

const PORT = 3010;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Puerto: ${PORT}`);
    });
}

module.exports = app;