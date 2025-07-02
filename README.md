# TFG Visualizador de Bases de Datos Relacionales

Este proyecto permite visualizar y transformar bases de datos relacionales en grafos y ontologías, integrando scripts en Python y un servidor web en Node.js.

## Requisitos previos

- Python 3.8 o superior
- Node.js 16 o superior
- pip (gestor de paquetes de Python)
- npm (gestor de paquetes de Node.js)

## Instalación

### 1. Clona el repositorio y accede a la carpeta del proyecto

```sh
cd ruta/al/proyecto/TFG
```

### 2. Instala dependencias de Python

Se recomienda usar un entorno virtual:

```sh
python -m venv venv
source venv/bin/activate  # En Windows: .\venv\Scripts\activate
pip install rdflib
# Añade aquí otros paquetes si tu código los requiere
```

### 3. Instala dependencias de Node.js

```sh
npm install
```

## Ejecución

### 1. Inicia el servidor Node.js

```sh
node server.js
# o si tienes script en package.json
npm start
```

El servidor estará disponible en [http://localhost:3000](http://localhost:3000) o el puerto configurado.

## Pruebas

### Tests de Node.js

```sh
npm test
```

### Tests de Python

```sh
python -m unittest src.test_tfg_unittest
```

#### Cobertura de tests Python

```sh
pip install coverage
coverage run -m unittest src.test_tfg_unittest
coverage report -m
coverage html
# Abre htmlcov/index.html en tu navegador
```

## Estructura del proyecto

- `src/` — Scripts Python para procesamiento y transformación de datos
- `server.js` — Servidor web Node.js
- `public/` — Archivos estáticos y visualización web
- `data/` — Archivos de datos de ejemplo y resultados
- `uploads/` — Archivos subidos por el usuario

## Notas

- Todos los tests se ejecutan en entornos temporales, no afectan a los datos reales.
- Si tienes problemas de permisos, ejecuta la terminal como administrador.
- Para dudas sobre dependencias, revisa `package.json`.

---
TFG