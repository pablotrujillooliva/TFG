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
<div>
  <label for="elementoSelect" style="margin-left:2em;">Selecciona el elemento:</label>
  <select id="elementoSelect"></select>
  <button id="btnVerElemento" style="background:darkorange;color:white;">Ver relacionados</button>
</div>
<div id="cy" style="width: 100%; height: 600px; border: 1px solid #ccc; background:white;"></div>
<div id="info" style="white-space: pre; margin-top: 1em; background:rgb(245, 245, 220); border: 1px solid #ccc; padding: 10px;"></div>
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
  actualizarSelectorColumnas();
  actualizarSelectorElementos();
}

function actualizarSelectorColumnas() {
  const columnaSel = document.getElementById('columnaFiltro');
  columnaSel.innerHTML = '';
  // Busca nodos de la tabla actual
  const nodosTabla = tablaActual === '__ALL__'
    ? allElements.filter(e => e.data && e.data.label)
    : allElements.filter(e =>
        e.data && e.data.label && String(e.data.label).split(':')[0].trim() === tablaActual
      );
  // Extrae todas las claves del label de los nodos
  const columnasSet = new Set();
  nodosTabla.forEach(nodo => {
    if (nodo.data && nodo.data.label) {
      // Extrae la parte después de los dos puntos
      const partes = nodo.data.label.split(':');
      if (partes.length > 1) {
        const atributos = partes[1].split(',');
        atributos.forEach(attr => {
          const [col] = attr.split('=');
          if (col && col.trim()) columnasSet.add(col.trim());
        });
      }
    }
  });
  // Añade opción "label" para buscar por el label completo
  columnaSel.appendChild(new Option('label', 'label'));
  // Añade todas las columnas encontradas
  Array.from(columnasSet).forEach(col => {
    columnaSel.appendChild(new Option(col, col));
  });
}

function actualizarSelectorElementos(filtro = '') {
  const elementoSel = document.getElementById('elementoSelect');
  const columnaSel = document.getElementById('columnaFiltro');
  const columna = columnaSel ? columnaSel.value : 'label';
  elementoSel.innerHTML = '';
  if (tablaActual === '__NONE__') return;
  const nodosTabla = tablaActual === '__ALL__'
    ? allElements.filter(e => e.data && e.data.label)
    : allElements.filter(e =>
        e.data && e.data.label && String(e.data.label).split(':')[0].trim() === tablaActual
      );
  // Filtra por columna y texto si hay filtro
  const nodosFiltrados = filtro
    ? nodosTabla.filter(nodo => {
        if (columna === 'label') {
          return nodo.data.label && nodo.data.label.toLowerCase().includes(filtro.toLowerCase());
        } else if (nodo.data.label) {
          // Extrae la parte después de los dos puntos
          const partes = nodo.data.label.split(':');
          if (partes.length > 1) {
            const atributos = partes[1].split(',');
            for (let attr of atributos) {
              let [key, value] = attr.split('=');
              if (key && value && key.trim() === columna) {
                return value.trim().toLowerCase().includes(filtro.toLowerCase());
              }
            }
          }
        }
        return false;
      })
    : nodosTabla;
  nodosFiltrados.forEach(nodo => {
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
      { 
        selector: 'node', 
        style: { 
          // Mostrar la tabla como etiqueta del nodo
          'label': 'data(table)',
          'background-color': '#ADD8E6',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': 6,
          'text-outline-color': '#000000',
          'text-outline-width': 1
        } 
      },
      { selector: 'edge', style: { 'label': '', 'width': 2, 'line-color': '#aaa' } }
    ],
    layout: { name: 'cose' }
  });

  cy.on('tap', 'node', function(evt){
    var node = evt.target;
    nodoSeleccionado = node.data('id');
    var info = node.data('info') || {};
    if (Object.keys(info).length === 0 && node.data('label')) {
      const label = node.data('label');
      const partes = label.split(':');
      if (partes.length > 1) {
        const atributos = partes[1].split(',');
        atributos.forEach(attr => {
          const [k, v] = attr.split('=');
          if (k && v) info[k.trim()] = v.trim();
        });
      }
    }
    // Muestra la información como lista lateral
    let html = '<div style="text-align:left;"><b>Información del nodo:</b><ul style="padding-left:18px;">';
    for (const k in info) {
      html += '<li><b>' + k + ':</b> ' + info[k] + '</li>';
    }
    html += '</ul></div>';
    document.getElementById('info').innerHTML = html;
  });
}

// Expande nodos relacionados con el nodo seleccionado (máx 50)


function cargarGrafo(nombreArchivo) {
  fetch('/data/' + nombreArchivo)
    .then(response => response.json())
    .then(data => {
      // Añade el campo table a cada nodo
      data.elements.forEach(e => {
        if (e.data && e.data.label && !e.data.table) {
          const partes = e.data.label.split(':');
          e.data.table = partes[0] ? partes[0].trim() : '';
        }
      });
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
    actualizarSelectorColumnas();
    actualizarSelectorElementos();
    if (cy) { cy.destroy(); cy = null; }
    document.getElementById('info').textContent = '';

    // Si selecciona "Todos", mostrar todo el grafo
    if (tablaActual === '__ALL__') {
      mostrarTablaSeleccionada();
    }
    // Si selecciona cualquier otra opción (incluyendo "---" o una tabla concreta), NO mostrar nada
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
      { 
        selector: 'node', 
        style: { 
          // Mostrar la tabla como etiqueta del nodo
          'label': 'data(table)',
          'background-color': '#ADD8E6',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': 4,
          'text-outline-color': '#000000',
          'text-outline-width': 1
        } 
      },
      { selector: 'edge', style: { 'label': '', 'width': 2, 'line-color': '#aaa' } }
    ],
    layout: { name: 'cose' }
  });

  cy.on('tap', 'node', function(evt){
    var node = evt.target;
    nodoSeleccionado = node.data('id');
    var info = node.data('info') || {};
    if (Object.keys(info).length === 0 && node.data('label')) {
      const label = node.data('label');
      const partes = label.split(':');
      if (partes.length > 1) {
        const atributos = partes[1].split(',');
        atributos.forEach(attr => {
          const [k, v] = attr.split('=');
          if (k && v) info[k.trim()] = v.trim();
        });
      }
    }
    // Muestra la información como lista lateral
    let html = '<div style="text-align:left;"><b>Información del nodo:</b><ul style="padding-left:18px;">';
    for (const k in info) {
      html += '<li><b>' + k + ':</b> ' + info[k] + '</li>';
    }
    html += '</ul></div>';
    document.getElementById('info').innerHTML = html;
  });
});

  document.getElementById('btnBuscarElemento').addEventListener('click', function() {
    const filtro = document.getElementById('elementoFiltro').value;
    actualizarSelectorElementos(filtro);
  });

  // Si quieres que al cambiar de columna también se limpie el filtro:
  document.getElementById('columnaFiltro').addEventListener('change', function() {
    document.getElementById('elementoFiltro').value = '';
    actualizarSelectorElementos('');
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