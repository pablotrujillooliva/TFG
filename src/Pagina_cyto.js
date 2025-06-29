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

  addNodeTapHandler();

  function addNodeTapHandler() {
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
      let html = '<div style="text-align:left;"><b>Información del nodo:</b><ul style="padding-left:18px;">';
      for (const k in info) {
        html += '<li><b>' + k + ':</b> ' + info[k] + '</li>';
      }
      document.getElementById('info').innerHTML = html;

      document.getElementById('btnExpandirNodo').onclick = function() {
        // Encuentra todos los edges conectados al nodo seleccionado
        const edgesConectados = allElements.filter(e =>
          e.data && e.data.source && e.data.target &&
          (e.data.source === nodoSeleccionado || e.data.target === nodoSeleccionado)
        );
        // Añade los nodos conectados por esos edges
        let nuevosNodos = new Set([nodoSeleccionado]);
        for (const edge of edgesConectados) {
          nuevosNodos.add(edge.data.source);
          nuevosNodos.add(edge.data.target);
        }
        // Filtra nodos y edges a mostrar
        const nodosConectados = allElements.filter(e =>
          e.data && e.data.id && nuevosNodos.has(e.data.id)
        );
        const idsPermitidos = new Set(nodosConectados.map(e => e.data.id));
        const edgesFiltrados = allElements.filter(e =>
          e.data && e.data.source && e.data.target &&
          idsPermitidos.has(e.data.source) && idsPermitidos.has(e.data.target)
        );
        const elementosMostrar = [...nodosConectados, ...edgesFiltrados];
        if (cy) cy.destroy();
        cy = cytoscape({
          container: document.getElementById('cy'),
          elements: elementosMostrar,
          style: [
            { 
              selector: 'node', 
              style: { 
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

        addNodeTapHandler(); // <-- Añade el handler de nuevo
      };
    });
  }
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

  addNodeTapHandler();

  function addNodeTapHandler() {
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
      let html = '<div style="text-align:left;"><b>Información del nodo:</b><ul style="padding-left:18px;">';
      for (const k in info) {
        html += '<li><b>' + k + ':</b> ' + info[k] + '</li>';
      }
      document.getElementById('info').innerHTML = html;

      document.getElementById('btnExpandirNodo').onclick = function() {
        // Encuentra todos los edges conectados al nodo seleccionado
        const edgesConectados = allElements.filter(e =>
          e.data && e.data.source && e.data.target &&
          (e.data.source === nodoSeleccionado || e.data.target === nodoSeleccionado)
        );
        // Añade los nodos conectados por esos edges
        let nuevosNodos = new Set([nodoSeleccionado]);
        for (const edge of edgesConectados) {
          nuevosNodos.add(edge.data.source);
          nuevosNodos.add(edge.data.target);
        }
        // Filtra nodos y edges a mostrar
        const nodosConectados = allElements.filter(e =>
          e.data && e.data.id && nuevosNodos.has(e.data.id)
        );
        const idsPermitidos = new Set(nodosConectados.map(e => e.data.id));
        const edgesFiltrados = allElements.filter(e =>
          e.data && e.data.source && e.data.target &&
          idsPermitidos.has(e.data.source) && idsPermitidos.has(e.data.target)
        );
        const elementosMostrar = [...nodosConectados, ...edgesFiltrados];
        if (cy) cy.destroy();
        cy = cytoscape({
          container: document.getElementById('cy'),
          elements: elementosMostrar,
          style: [
            { 
              selector: 'node', 
              style: { 
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

        addNodeTapHandler(); // <-- Añade el handler de nuevo
      };
    });
  }
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