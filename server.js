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

// Página principal con formulario de subida
app.get('/', (req, res) => {
    const ttlFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.ttl'));
    const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const images = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.png'));
    const uploadFiles = fs.readdirSync(UPLOADS_DIR);

    let html = `<h1>TFG Data Viewer (Node.js)</h1>
    <form action="/borrar-data" method="post" onsubmit="return confirm('¿Seguro que quieres borrar TODOS los archivos de data?');">
      <button type="submit" style="background:red;color:white;">Borrar archivos</button>
    </form>
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
<label for="tablaSelect">Selecciona la tabla a visualizar:</label>
<select id="tablaSelect"></select>
<label for="grafoSelect" style="margin-left:2em;">Selecciona el grafo:</label>
<select id="grafoSelect">
  ${jsonFiles.map(f => `<option value="${f}">${f}</option>`).join('')}
</select>
<label for="elementoSelect" style="margin-left:2em;">Selecciona el elemento:</label>
<select id="elementoSelect"></select>
<button id="btnVerElemento">Ver relacionados</button>
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
let tablasDisponibles = [];
let tablaActual = null;
let nodoSeleccionado = null;
let nodosVisibles = new Set();

// Extrae los nombres de tabla de los nodos
function extraerTablas() {
  const tablasSet = new Set();
  allElements.forEach(e => {
    if (e.data && e.data.label) {
      // Extrae lo que va antes de los dos puntos
      const tabla = String(e.data.label).split(':')[0].trim();
      tablasSet.add(tabla);
    }
  });
  tablasDisponibles = Array.from(tablasSet);
}

function actualizarSelectorTablas() {
  const tablaSel = document.getElementById('tablaSelect');
  tablaSel.innerHTML = '';
  // Opción "---"
  const optNone = document.createElement('option');
  optNone.value = '__NONE__';
  optNone.textContent = '---';
  tablaSel.appendChild(optNone);
  // Opción neutra
  const optTodos = document.createElement('option');
  optTodos.value = '__ALL__';
  optTodos.textContent = 'Todos';
  tablaSel.appendChild(optTodos);
  // Opciones de tablas reales
  tablasDisponibles.forEach(tabla => {
    const opt = document.createElement('option');
    opt.value = tabla;
    opt.textContent = tabla;
    tablaSel.appendChild(opt);
  });
  tablaActual = tablaSel.value;
  actualizarSelectorElementos();
}

function actualizarSelectorElementos() {
  const elementoSel = document.getElementById('elementoSelect');
  elementoSel.innerHTML = '';
  if (tablaActual === '__NONE__') return; // No mostrar nada
  // Todos los nodos si está seleccionado "Todos"
  const nodosTabla = tablaActual === '__ALL__'
    ? allElements.filter(e => e.data && e.data.label)
    : allElements.filter(e =>
        e.data && e.data.label && String(e.data.label).split(':')[0].trim() === tablaActual
      );
  nodosTabla.forEach(nodo => {
    const opt = document.createElement('option');
    opt.value = nodo.data.id;
    opt.textContent = nodo.data.label;
    elementoSel.appendChild(opt);
  });
}

function mostrarTablaSeleccionada() {
  if (tablaActual === '__NONE__') {
    if (cy) cy.destroy();
    cy = null;
    return;
  }
  // Todos los nodos si está seleccionado "Todos"
  const nodosTabla = tablaActual === '__ALL__'
    ? allElements.filter(e => e.data && e.data.label)
    : allElements.filter(e =>
        e.data && e.data.label && String(e.data.label).split(':')[0].trim() === tablaActual
      );
  const idsTabla = new Set(nodosTabla.map(e => e.data.id));
  const edgesTabla = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    idsTabla.has(e.data.source) && idsTabla.has(e.data.target)
  );
  const elementosMostrar = [...nodosTabla, ...edgesTabla];

  nodosVisibles = new Set(nodosTabla.map(e => e.data.id));

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

// Expande nodos relacionados con el nodo seleccionado (máx 50)
function mostrarMasRelacionados() {
  if (!nodoSeleccionado) return;

  // Solo nodos de la tabla actual
  const nodosTabla = allElements.filter(e =>
    e.data && e.data.label === tablaActual
  );
  const idsTabla = new Set(nodosTabla.map(e => e.data.id));

  // Empieza con los nodos actualmente visibles
  let nuevosNodos = new Set(nodosVisibles);

  // Encuentra edges conectados al nodo seleccionado (solo dentro de la tabla)
  const edgesConectados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    idsTabla.has(e.data.source) && idsTabla.has(e.data.target) &&
    (e.data.source === nodoSeleccionado || e.data.target === nodoSeleccionado)
  );

  // Añade los nodos conectados por esos edges, sin superar 50 nodos
  for (const edge of edgesConectados) {
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.source);
    if (nuevosNodos.size < 50) nuevosNodos.add(edge.data.target);
    if (nuevosNodos.size >= 50) break;
  }

  // Filtra nodos y edges a mostrar
  const nodosConectados = nodosTabla.filter(e => nuevosNodos.has(e.data.id));
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

function cargarGrafo(nombreArchivo) {
  fetch('/data/' + nombreArchivo)
    .then(response => response.json())
    .then(data => {
      allElements = data.elements;
      extraerTablas();
      actualizarSelectorTablas();
      // NO LLAMES a mostrarTablaSeleccionada aquí
    });
}

document.addEventListener('DOMContentLoaded', function() {
  const grafoSelect = document.getElementById('grafoSelect');
  cargarGrafo(grafoSelect.value);
  grafoSelect.addEventListener('change', function() {
    cargarGrafo(this.value);
    if (cy) { cy.destroy(); cy = null; }
    document.getElementById('info').textContent = '';
  });
  document.getElementById('tablaSelect').addEventListener('change', function() {
    tablaActual = this.value;
    actualizarSelectorElementos();
    if (cy) { cy.destroy(); cy = null; }
    document.getElementById('info').textContent = '';

    // Si selecciona "Todos", mostrar todo el grafo
    if (tablaActual === '__ALL__') {
      mostrarTablaSeleccionada();
    }
    // Si selecciona cualquier otra opción (incluyendo "---" o una tabla concreta), NO mostrar nada
  });
  document.getElementById('btnMas').addEventListener('click', function() {
    mostrarMasRelacionados();
  });
  document.getElementById('btnVerElemento').addEventListener('click', function() {
  const elementoId = document.getElementById('elementoSelect').value;
  if (!elementoId) return;

  // Encuentra todos los edges conectados al nodo seleccionado (de cualquier tabla)
  const edgesConectados = allElements.filter(e =>
    e.data && e.data.source && e.data.target &&
    (e.data.source === elementoId || e.data.target === elementoId)
  );

  // Añade los nodos conectados por esos edges (de cualquier tabla)
  let nuevosNodos = new Set([elementoId]);
  for (const edge of edgesConectados) {
    nuevosNodos.add(edge.data.source);
    nuevosNodos.add(edge.data.target);
  }

  // Filtra nodos y edges a mostrar (de cualquier tabla)
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
});
});

cargarGrafo('grafo_datos.json');
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