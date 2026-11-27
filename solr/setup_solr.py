"""Configure Apache Solr schema (with SpatialRecursivePrefixTreeFieldType) and index Stage 1 JSON."""

import argparse
import json
import sys
import time
from pathlib import Path

import requests

DEFAULT_SOLR_URL = "http://localhost:8983/solr"
DEFAULT_CORE = "insectos_asp"
DEFAULT_JSON = Path(__file__).resolve().parent.parent / "part-00000-efad9038-c017-427b-b8e0-1f17c05d06c5-c000.json"

FIELD_TYPES = [
    {
        "name": "location_jts",
        "class": "solr.SpatialRecursivePrefixTreeFieldType",
        "spatialContextFactory": "JTS",
        "geo": "true",
        "distErrPct": "0.025",
        "maxDistErr": "0.001",
        "distanceUnits": "kilometers",
        "autoIndex": "true",
    }
]

FIELDS = [
    {"name": "gbif_id", "type": "plong", "stored": True, "indexed": True},
    {"name": "occurrence_id", "type": "string", "stored": True, "indexed": True},
    {"name": "nombre_cientifico", "type": "text_general", "stored": True, "indexed": True},
    {"name": "reino", "type": "string", "stored": True, "indexed": True},
    {"name": "filo", "type": "string", "stored": True, "indexed": True},
    {"name": "clase", "type": "string", "stored": True, "indexed": True},
    {"name": "orden", "type": "string", "stored": True, "indexed": True},
    {"name": "familia", "type": "string", "stored": True, "indexed": True},
    {"name": "genero", "type": "string", "stored": True, "indexed": True},
    {"name": "especie", "type": "string", "stored": True, "indexed": True},
    {"name": "rango_taxonomico", "type": "string", "stored": True, "indexed": True},
    {"name": "identificado_a_especie", "type": "boolean", "stored": True, "indexed": True},
    {"name": "base_registro", "type": "string", "stored": True, "indexed": True},
    {"name": "institucion", "type": "string", "stored": True, "indexed": True},
    {"name": "registrado_por", "type": "text_general", "stored": True, "indexed": True},
    {"name": "licencia", "type": "string", "stored": True, "indexed": True},
    {"name": "provincia", "type": "string", "stored": True, "indexed": True},
    {"name": "localidad", "type": "text_general", "stored": True, "indexed": True},
    {"name": "location", "type": "location_jts", "stored": True, "indexed": True},
    {"name": "latitud", "type": "pdouble", "stored": True, "indexed": True},
    {"name": "longitud", "type": "pdouble", "stored": True, "indexed": True},
    {"name": "elevacion_m", "type": "pfloat", "stored": True, "indexed": True},
    {"name": "elevacion_imputada", "type": "boolean", "stored": True, "indexed": True},
    {"name": "piso_altitudinal", "type": "string", "stored": True, "indexed": True},
    {"name": "anio", "type": "pint", "stored": True, "indexed": True},
    {"name": "mes", "type": "pint", "stored": True, "indexed": True},
    {"name": "decada", "type": "pint", "stored": True, "indexed": True},
    {"name": "fecha_evento", "type": "pdate", "stored": True, "indexed": True},
    {"name": "fecha_fin", "type": "pdate", "stored": True, "indexed": True},
    {"name": "duracion_evento_dias", "type": "pint", "stored": True, "indexed": True},
    {"name": "fecha_precision", "type": "string", "stored": True, "indexed": True},
    {"name": "mes_imputado", "type": "boolean", "stored": True, "indexed": True},
    {"name": "issues", "type": "string", "stored": True, "indexed": True, "multiValued": True},
    {"name": "n_issues", "type": "pint", "stored": True, "indexed": True},
    {"name": "en_asp", "type": "boolean", "stored": True, "indexed": True},
    {"name": "metodo_match", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_id", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_nombre", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_categoria", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_sigla_categoria", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_estatus", "type": "string", "stored": True, "indexed": True},
    {"name": "asp_area_km2", "type": "pfloat", "stored": True, "indexed": True},
    {"name": "asp_anio_creacion", "type": "pint", "stored": True, "indexed": True},
    {"name": "antiguedad_asp_al_registro", "type": "pint", "stored": True, "indexed": True},
    {"name": "area_conservacion", "type": "string", "stored": True, "indexed": True},
    {"name": "sigla_ac", "type": "string", "stored": True, "indexed": True},
    {"name": "anomalia_zscore", "type": "boolean", "stored": True, "indexed": True},
    {"name": "anomalia_kmeans", "type": "boolean", "stored": True, "indexed": True},
    {"name": "anomalia_iforest", "type": "boolean", "stored": True, "indexed": True},
    {"name": "if_score", "type": "pfloat", "stored": True, "indexed": True},
    {"name": "n_algoritmos_anomalia", "type": "pint", "stored": True, "indexed": True},
]


def wait_for_solr(base_url: str, core: str, timeout: int = 60) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(f"{base_url}/{core}/admin/ping", timeout=3)
            if r.status_code == 200:
                return
        except requests.RequestException:
            pass
        time.sleep(2)
    raise RuntimeError(f"Solr core '{core}' did not respond at {base_url} within {timeout}s.")


def configure_schema(base_url: str, core: str) -> None:
    schema_url = f"{base_url}/{core}/schema"
    existing = requests.get(schema_url, timeout=10).json().get("schema", {})
    existing_types = {ft["name"] for ft in existing.get("fieldTypes", [])}
    existing_fields = {f["name"] for f in existing.get("fields", [])}

    for ft in FIELD_TYPES:
        action = "replace-field-type" if ft["name"] in existing_types else "add-field-type"
        resp = requests.post(schema_url, json={action: ft}, timeout=15)
        resp.raise_for_status()

    for field in FIELDS:
        action = "replace-field" if field["name"] in existing_fields else "add-field"
        resp = requests.post(schema_url, json={action: field}, timeout=15)
        resp.raise_for_status()

    print(f"Schema configured successfully for core '{core}'.")


def index_json(base_url: str, core: str, json_path: Path, batch_size: int = 5000) -> None:
    if not json_path.exists():
        raise FileNotFoundError(f"JSON file not found: {json_path}")

    update_url = f"{base_url}/{core}/update/json/docs"
    batch = []
    total = 0
    started = time.time()

    with json_path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            batch.append(json.loads(line))
            if len(batch) >= batch_size:
                resp = requests.post(update_url, json=batch, timeout=60)
                resp.raise_for_status()
                total += len(batch)
                batch.clear()
                print(f"Indexed {total} documents...", flush=True)

    if batch:
        resp = requests.post(update_url, json=batch, timeout=60)
        resp.raise_for_status()
        total += len(batch)

    commit_resp = requests.post(f"{base_url}/{core}/update", params={"commit": "true"}, json={}, timeout=60)
    commit_resp.raise_for_status()
    elapsed = time.time() - started
    print(f"Done! Indexed {total} documents into '{core}' in {elapsed:.1f}s.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Configure Solr schema and index Stage 1 NDJSON.")
    parser.add_argument("--solr-url", default=DEFAULT_SOLR_URL)
    parser.add_argument("--core", default=DEFAULT_CORE)
    parser.add_argument("--json-file", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--batch-size", type=int, default=5000)
    parser.add_argument("--schema-only", action="store_true")
    args = parser.parse_args()

    wait_for_solr(args.solr_url, args.core)
    configure_schema(args.solr_url, args.core)
    if not args.schema_only:
        index_json(args.solr_url, args.core, args.json_file, args.batch_size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
