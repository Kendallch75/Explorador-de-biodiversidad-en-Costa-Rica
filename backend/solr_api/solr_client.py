"""Cliente HTTP y constructor de consultas para Apache Solr."""

import json
from typing import Any

import requests
from django.conf import settings


DEFAULT_JSON_FACET = {
    "por_provincia_y_orden": {
        "type": "terms",
        "field": "provincia",
        "limit": 8,
        "facet": {
            "ordenes": {
                "type": "terms",
                "field": "orden",
                "limit": 5,
                "facet": {
                    "en_asp": {
                        "type": "terms",
                        "field": "en_asp",
                    }
                },
            }
        },
    },
    "stats_por_area_conservacion": {
        "type": "terms",
        "field": "area_conservacion",
        "limit": 12,
        "facet": {
            "elevacion_prom": "avg(elevacion_m)",
            "elevacion_min": "min(elevacion_m)",
            "elevacion_max": "max(elevacion_m)",
            "total_issues": "sum(n_issues)",
        },
    },
}


def build_polygon_wkt(coordinates: list[list[float]]) -> str:
    """Convierte una lista de pares [lon, lat] en un WKT POLYGON cerrado para Solr."""
    if len(coordinates) < 3:
        raise ValueError("Un polígono requiere al menos 3 vértices.")

    ring = [[float(lon), float(lat)] for lon, lat in coordinates]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    points_str = ", ".join(f"{lon} {lat}" for lon, lat in ring)
    return f"POLYGON(({points_str}))"


def build_solr_params(
    q: str = "*:*",
    fq: list[str] | None = None,
    sort: str = "anio desc",
    rows: int = 100,
    start: int = 0,
    include_facets: bool = True,
) -> dict[str, Any]:
    """Construye el diccionario de parámetros GET/POST para /select en Apache Solr."""
    params: dict[str, Any] = {
        "q": q or "*:*",
        "fq": fq or [],
        "sort": sort or "anio desc",
        "rows": min(max(int(rows), 0), 1000),
        "start": max(int(start), 0),
        "wt": "json",
    }

    if include_facets:
        params.update(
            {
                "facet": "true",
                "facet.mincount": 1,
                "facet.limit": 15,
                "facet.field": ["orden", "provincia", "piso_altitudinal", "asp_categoria"],
                "facet.range": ["anio", "elevacion_m"],
                "f.anio.facet.range.start": 1950,
                "f.anio.facet.range.end": 2030,
                "f.anio.facet.range.gap": 10,
                "f.elevacion_m.facet.range.start": 0,
                "f.elevacion_m.facet.range.end": 4000,
                "f.elevacion_m.facet.range.gap": 500,
                "facet.query": [
                    "en_asp:true",
                    "en_asp:false",
                    "identificado_a_especie:true",
                    "n_algoritmos_anomalia:[1 TO *]",
                    "n_algoritmos_anomalia:[2 TO *]",
                ],
                "json.facet": json.dumps(DEFAULT_JSON_FACET, ensure_ascii=False),
            }
        )

    return params


def _pair_list_to_buckets(raw: list[Any]) -> list[dict[str, Any]]:
    """Convierte [clave1, conteo1, clave2, conteo2, ...] de Solr en lista de objetos."""
    return [{"value": str(raw[i]), "count": raw[i + 1]} for i in range(0, len(raw), 2)]


def format_solr_response(raw: dict[str, Any], sent_params: dict[str, Any]) -> dict[str, Any]:
    """Normaliza la respuesta de Solr para el frontend React."""
    response_body = raw.get("response", {})
    facet_counts = raw.get("facet_counts", {})
    raw_fields = facet_counts.get("facet_fields", {})
    raw_ranges = facet_counts.get("facet_ranges", {})
    raw_queries = facet_counts.get("facet_queries", {})
    json_facets = raw.get("facets", {})

    field_facets = {
        field: _pair_list_to_buckets(values)
        for field, values in raw_fields.items()
    }

    range_facets = {}
    for field, info in raw_ranges.items():
        range_facets[field] = {
            "start": info.get("start"),
            "end": info.get("end"),
            "gap": info.get("gap"),
            "buckets": _pair_list_to_buckets(info.get("counts", [])),
        }

    query_facets = [
        {"query": key, "count": count}
        for key, count in raw_queries.items()
    ]

    return {
        "numFound": response_body.get("numFound", 0),
        "start": response_body.get("start", 0),
        "qTime": raw.get("responseHeader", {}).get("QTime", 0),
        "docs": response_body.get("docs", []),
        "facets": {
            "field_facets": field_facets,
            "range_facets": range_facets,
            "query_facets": query_facets,
            "nested": json_facets.get("por_provincia_y_orden", {}).get("buckets", []),
            "stats": json_facets.get("stats_por_area_conservacion", {}).get("buckets", []),
        },
        "solrParams": sent_params,
    }


def execute_solr_select(params: dict[str, Any]) -> dict[str, Any]:
    """Ejecuta una consulta /select contra Apache Solr usando POST form-urlencoded."""
    url = f"{settings.SOLR_BASE_URL}/{settings.SOLR_CORE}/select"
    resp = requests.post(url, data=params, timeout=20)
    resp.raise_for_status()
    return format_solr_response(resp.json(), params)


def execute_proximity_query(
    lat: float,
    lon: float,
    radius_km: float,
    q: str = "*:*",
    fq: list[str] | None = None,
    sort: str = "geodist() asc",
    rows: int = 150,
    include_facets: bool = True,
) -> dict[str, Any]:
    """Ejecuta consulta geoespacial por proximidad usando {!geofilt} en Solr."""
    geofilt = f"{{!geofilt sfield=location pt={float(lat)},{float(lon)} d={float(radius_km)}}}"
    filters = [geofilt, *(fq or [])]
    params = build_solr_params(
        q=q,
        fq=filters,
        sort=sort,
        rows=rows,
        include_facets=include_facets,
    )
    if "geodist()" in (sort or ""):
        params["sfield"] = "location"
        params["pt"] = f"{float(lat)},{float(lon)}"
    return execute_solr_select(params)


def execute_polygon_query(
    coordinates: list[list[float]],
    q: str = "*:*",
    fq: list[str] | None = None,
    sort: str = "anio desc",
    rows: int = 150,
    include_facets: bool = True,
) -> dict[str, Any]:
    """Ejecuta consulta geoespacial por polígono WKT directamente en Apache Solr."""
    wkt = build_polygon_wkt(coordinates)
    spatial_fq = f'location:"Intersects({wkt})"'
    filters = [spatial_fq, *(fq or [])]
    params = build_solr_params(
        q=q,
        fq=filters,
        sort=sort,
        rows=rows,
        include_facets=include_facets,
    )
    return execute_solr_select(params)


def autocomplete_species(term: str, limit: int = 10) -> list[dict[str, Any]]:
    """Sugiere especies en tiempo real desde Apache Solr usando facet.contains."""
    cleaned = term.strip()
    if len(cleaned) < 2:
        return []

    url = f"{settings.SOLR_BASE_URL}/{settings.SOLR_CORE}/select"
    params = {
        "q": "*:*",
        "rows": 0,
        "wt": "json",
        "facet": "true",
        "facet.field": "especie",
        "facet.contains": cleaned,
        "facet.contains.ignoreCase": "true",
        "facet.mincount": 1,
        "facet.limit": min(max(int(limit), 1), 25),
    }
    resp = requests.get(url, params=params, timeout=5)
    resp.raise_for_status()
    raw_list = resp.json().get("facet_counts", {}).get("facet_fields", {}).get("especie", [])
    return [{"especie": raw_list[i], "count": raw_list[i + 1]} for i in range(0, len(raw_list), 2)]


def check_solr_health() -> dict[str, Any]:
    """Verifica disponibilidad del core de Apache Solr y cantidad de documentos."""
    url = f"{settings.SOLR_BASE_URL}/{settings.SOLR_CORE}/select"
    resp = requests.get(url, params={"q": "*:*", "rows": 0, "wt": "json"}, timeout=5)
    resp.raise_for_status()
    data = resp.json()
    return {
        "solr_ok": True,
        "core": settings.SOLR_CORE,
        "solr_url": settings.SOLR_BASE_URL,
        "total_docs": data.get("response", {}).get("numFound", 0),
    }
