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
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Servir archivos estáticos (imágenes, ttl, json)
app.use('/webvowl', express.static(path.join(__dirname, '/webvowl')));
app.use('/data', express.static(DATA_DIR));

// Página principal con formulario de subida
app.get('/', (req, res) => {
    const ttlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ttl'));
    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const images = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.png'));
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);

    let html = `<h1>TFG Data Viewer (Node.js)</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
        <label>Sube tu base de datos (.db):</label>
        <input type="file" name="dbfile" accept=".db" required>
        <button type="submit">Subir y transformar</button>
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
            <button type="submit">Procesar</button>
        </form>
    </li>`;
    });
    html += `</ul>`;

    // Añade la sección de Cytoscape.js
    html += `
<h2>Visualización interactiva (Cytoscape.js)</h2>
<label for="grafoSelect">Selecciona el grafo a visualizar:</label>
<select id="grafoSelect">
  <option value="grafo.json">Estructura (grafo.json)</option>
  <option value="grafo_datos.json">Datos reales (grafo_datos.json)</option>
</select>
<div>
  <button id="btnExpandir">Expandir nodo seleccionado</button>
  <button id="btnMas">Mostrar más relacionados</button>
  <button id="btnOtro">Mostrar otro nodo aleatorio</button>
</div>
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc;"></div>
<div id="info" style="white-space: pre; margin-top: 1em; background: #f8f8f8; border: 1px solid #ccc; padding: 10px;"></div>
<script src="https://unpkg.com/cytoscape/dist/cytoscape.min.js"></script>
<script>
let allElements = [];
let cy = null;
let nodosVisibles = new Set();
let nodoCentral = null;
let nodoSeleccionado = null;

function cargarGrafo(nombreArchivo) {
  fetch('/data/' + nombreArchivo)
    .then(response => response.json())
    .then(data => {
      allElements = data.elements;
      mostrarNodoCentralAleatorio();
    });
}

function mostrarNodoCentralAleatorio() {
  const nodos = allElements.filter(e => e.data && e.data.id && !e.data.source && !e.data.target);
  if (nodos.length === 0) return;
  nodoCentral = nodos[Math.floor(Math.random() * nodos.length)];
  nodosVisibles = new Set([nodoCentral.data.id]);
  mostrarRelacionados();
}

function mostrarRelacionados() {
  let nuevosNodos = new Set(nodosVisibles);
  const edgesConectados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    (nodosVisibles.has(e.data.source) || nodosVisibles.has(e.data.target))
  );
  for (const edge of edgesConectados) {
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.source);
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.target);
    if (nuevosNodos.size >= 50) break;
  }
  const nodosConectados = allElements.filter(e =>
    e.data && e.data.id && nuevosNodos.has(e.data.id)
  );
  const idsPermitidos = new Set(nodosConectados.map(e => e.data.id));
  const edgesFiltrados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    idsPermitidos.has(e.data.source) && idsPermitidos.has(e.data.target)
  );
  nodosVisibles = idsPermitidos;
  const elementosMostrar = [...nodosConectados, ...edgesFiltrados];

  if (cy) cy.destroy();
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: elementosMostrar,
    style: [
      { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#0074D9' } },
      { selector: 'edge', style: { 'label': 'data(label)', 'width': 2, 'line-color': '#aaa' } }
    ],
    layout: { name: 'cose' }
  });

  cy.on('tap', 'node', function(evt){
    var node = evt.target;
    nodoSeleccionado = node.data('id');
    var info = node.data('info');
    if (info) {
      document.getElementById('info').textContent = JSON.stringify(info, null, 2);
    }
  });
}

function expandirNodoSeleccionado() {
  if (!nodoSeleccionado) return;
  // Solo el nodo seleccionado y sus vecinos directos
  let nuevosNodos = new Set([nodoSeleccionado]);
  const edgesConectados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    (e.data.source === nodoSeleccionado || e.data.target === nodoSeleccionado)
  );
  for (const edge of edgesConectados) {
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.source);
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.target);
    if (nuevosNodos.size >= 50) break;
  }
  const nodosConectados = allElements.filter(e =>
    e.data && e.data.id && nuevosNodos.has(e.data.id)
  );
  const idsPermitidos = new Set(nodosConectados.map(e => e.data.id));
  const edgesFiltrados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    idsPermitidos.has(e.data.source) && idsPermitidos.has(e.data.target)
  );
  nodosVisibles = idsPermitidos;
  const elementosMostrar = [...nodosConectados, ...edgesFiltrados];

  if (cy) cy.destroy();
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements: elementosMostrar,
    style: [
      { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#0074D9' } },
      { selector: 'edge', style: { 'label': 'data(label)', 'width': 2, 'line-color': '#aaa' } }
    ],
    layout: { name: 'cose' }
  });

  cy.on('tap', 'node', function(evt){
    var node = evt.target;
    nodoSeleccionado = node.data('id');
    var info = node.data('info');
    if (info) {
      document.getElementById('info').textContent = JSON.stringify(info, null, 2);
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('grafoSelect').addEventListener('change', function() {
    cargarGrafo(this.value);
  });
  document.getElementById('btnMas').addEventListener('click', function() {
    mostrarRelacionados();
  });
  document.getElementById('btnOtro').addEventListener('click', function() {
    mostrarNodoCentralAleatorio();
  });
  document.getElementById('btnExpandir').addEventListener('click', function() {
    expandirNodoSeleccionado();
  });
});

cargarGrafo('grafo.json');
</script>
`;

    res.send(html);
});

// Ruta para subir y transformar la base de datos
app.post('/upload', upload.single('dbfile'), (req, res) => {
    if (!req.file) {
        return res.send('No se subió ningún archivo.');
    }
    const dbPath = path.resolve(req.file.path);

    // Llama a tu pipeline Python (ajusta la ruta si es necesario)
    // Usa python o python3 según tu sistema
    exec(`python "${path.join(SRC_DIR, 'Principal.py')}" "${dbPath}"`, { cwd: SRC_DIR }, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error) {
            return res.send('Error al procesar la base de datos.<br>' + stderr);
        }
        res.redirect('/');
    });
});

app.post('/procesar/:filename', (req, res) => {
    const dbFile = req.params.filename;
    const dbPath = path.join(UPLOADS_DIR, dbFile);

    // Llama a tu pipeline Python
    exec(`python "./src/Principal.py" "${dbPath}"`, { cwd: __dirname }, (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error) {
            return res.send('Error al procesar la base de datos.<br>' + stderr);
        }
        res.redirect('/');
    });
});

const PORT = 3010;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});