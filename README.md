# Proyecto #2 — ETL con Spark, Apache Solr y Consultas Geoespaciales (Insectos & ASP Costa Rica)

Aplicación web **Django REST + React (Vite + Leaflet)** conectada a **Apache Solr 9** (con soporte JTS para `SpatialRecursivePrefixTreeFieldType`) sobre los 169,994 registros integrados en la Etapa 1 (`part-00000-efad9038-c017-427b-b8e0-1f17c05d06c5-c000.json`).

## Estructura del proyecto

- `docker-compose.yml` y `solr/`: Contenedor de Apache Solr 9.7 con `jts-core-1.19.0.jar` y script `solr/setup_solr.py` para crear el esquema geoespacial (`location_jts`) e indexar los datos limpios.
- `backend/`: API REST en Django + DRF (`config/`, `solr_api/`) que construye consultas convencionales, *facets* (field, range, query, anidados y estadísticos) y consultas geoespaciales (`{!geofilt}` y `Intersects(POLYGON(...))`).
- `frontend/`: Interfaz gráfica en React + Tailwind CSS + Leaflet (`leaflet-draw`) con mapa interactivo, dibujo libre de polígonos, tabla de resultados, visualización de facets e inspector de consultas Solr.

## Puesta en marcha

### 1. Levantar Apache Solr e indexar los datos
```bash
docker compose up -d --build
```

Luego configura el esquema e indexa los 169,994 documentos usando el entorno virtual del backend:
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
python solr/setup_solr.py
```

### 2. Iniciar el Backend (Django)
```bash
source backend/.venv/bin/activate
python backend/manage.py runserver 8000
```

### 3. Iniciar el Frontend (React + Vite)
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

## Pruebas unitarias del backend
```bash
backend/.venv/bin/python backend/manage.py test solr_api
```
