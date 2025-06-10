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
app.use('/data', express.static(DATA_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

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