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

// Servir archivos estáticos (imágenes, ttl, json)
app.use('/webvowl', express.static(path.join(__dirname, '/webvowl')));
app.use('/data', express.static(DATA_DIR));
app.use('/src', express.static(SRC_DIR));

// Página principal con formulario de subida
app.get('/', (req, res) => {
    const ttlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ttl'));
    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const images = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.png'));
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);

    let html = `
<style>
  body {
    background: #F5F5DC;
  }
</style>
<h1>TFG Data Viewer</h1>
    <form action="/borrar-data" method="post" onsubmit="return confirm('¿Seguro que quieres borrar TODOS los archivos de data?');">
      <button type="submit" style="background:crimson;color:white;">Borrar archivos</button>
    </form>
    <form action="/upload" method="post" enctype="multipart/form-data">
        <label>Sube tu base de datos (.db):</label>
        <input type="file" name="dbfile" accept=".db" required>
        <button type="submit" style="background:darkgreen;color:white;">Subir y transformar</button>
    </form>
    <h2>Archivos TTL</h2><ul>`;
    ttlFiles.forEach(f => {
        html += `<li><a href="/data/${f}" target="_blank">${f}</a></li>`;
    });
    html += `</ul><h2>Archivos JSON</h2><ul>`;
    jsonFiles.forEach(f => {
        html += `<li><a href="/data/${f}" target="_blank">${f}</a></li>`;
    });
    html += `</ul><h2>Imágenes</h2><ul>`;
    images.forEach(f => {
        html += `<li><a href="/data/${f}" target="_blank">${f}</a></li>`;
    });
    html += `</ul>`;

    // Añade la sección de uploads
    html += `<h2>Uploads realizados</h2><ul>`;
    uploadFiles.forEach(f => {
        html += `<li>
        <a href="/uploads/${f}" target="_blank">${f}</a>
        <form action="/procesar/${encodeURIComponent(f)}" method="post" style="display:inline;">
            <button type="submit" style="background:gold;color:white;">Procesar</button>
        </form>
    </li>`;
    });
    html += `</ul>`;

    // Añade la sección de Cytoscape.js
    html += `
<h2>Visualización interactiva (Cytoscape.js)</h2>
<label for="tablaSelect">Selecciona la tabla a visualizar:</label>
<select id="tablaSelect"></select>
<label for="grafoSelect" style="margin-left:2em;">Selecciona el grafo:</label>
<select id="grafoSelect">
  ${jsonFiles.map(f => `<option value="${f}">${f}</option>`).join('')}
</select>
<label for="columnaFiltro" style="margin-left:2em;">Filtrar por columna:</label>
<select id="columnaFiltro"></select>
<input type="text" id="elementoFiltro" placeholder="Buscar elemento..." style="margin-left:1em;">
<button id="btnBuscarElemento" style="background:darkblue;color:white;">Buscar</button>
<div style="display: flex; align-items: center; gap: 0.5em; max-width: 100vw; overflow-x: hidden;">
  <label for="elementoSelect" style="margin-left:2em;">Selecciona el elemento:</label>
  <select id="elementoSelect" style="min-width: 350px; min-height: 3em; font-size: 0.7em; white-space: normal; line-height: 1.3;"></select>
</div>
<button id="btnVerElemento" style="background:darkorange;color:white;">Ver relacionados</button>
<button id="btnExpandirNodo" style="background:darkorange;color:white;">Expandir nodo</button>
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; background:white;"></div>
<div id="info" style="white-space: pre; margin-top: 1em; background:rgb(245, 245, 220); border: 1px solid #ccc; padding: 10px;"></div>
<script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
<script src="/src/Pagina_cyto.js"></script>
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
            return res.send('Error al procesar la base de datos.<br>' + stderr);
        }
        // Ejecuta Grafo.py
        exec(`python "${path.join(SRC_DIR, 'Grafo.py')}" "${dbPath}" "${grafoJson}"`, { cwd: SRC_DIR }, (error2, stdout2, stderr2) => {
            console.log(stdout2);
            console.error(stderr2);
            if (error2) {
                return res.send('Error al generar grafo.json.<br>' + stderr2);
            }
            // Ejecuta GrafoDatos.py
            exec(`python "${path.join(SRC_DIR, 'GrafoDatos.py')}" "${dbPath}" "${grafoDatosJson}"`, { cwd: SRC_DIR }, (error3, stdout3, stderr3) => {
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

app.post('/procesar/:filename', (req, res) => {
    const dbFile = req.params.filename;
    const dbPath = path.join(UPLOADS_DIR, dbFile);

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

const PORT = 3010;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});