"""Endpoints REST de Django para consultar Apache Solr."""

import requests
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .presets import PRESET_QUERIES
from .solr_client import (
    autocomplete_species,
    build_solr_params,
    check_solr_health,
    execute_polygon_query,
    execute_proximity_query,
    execute_solr_select,
)


def _solr_error_response(exc: Exception) -> Response:
    return Response(
        {"error": "Error al comunicarse con Apache Solr.", "detail": str(exc)},
        status=status.HTTP_502_BAD_GATEWAY,
    )


@api_view(["GET"])
def health_view(request):
    try:
        info = check_solr_health()
        return Response({"django_ok": True, **info})
    except requests.RequestException as exc:
        return Response(
            {"django_ok": True, "solr_ok": False, "detail": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(["GET"])
def presets_view(request):
    return Response({"presets": PRESET_QUERIES})


@api_view(["GET"])
def autocomplete_view(request):
    term = request.query_params.get("q", "")
    try:
        suggestions = autocomplete_species(term)
        return Response({"suggestions": suggestions})
    except requests.RequestException as exc:
        return _solr_error_response(exc)


@api_view(["POST"])
def query_view(request):
    data = request.data
    try:
        params = build_solr_params(
            q=data.get("q", "*:*"),
            fq=data.get("fq", []),
            sort=data.get("sort", "anio desc"),
            rows=data.get("rows", 100),
            start=data.get("start", 0),
            include_facets=data.get("include_facets", True),
        )
        result = execute_solr_select(params)
        return Response(result)
    except requests.RequestException as exc:
        return _solr_error_response(exc)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def proximity_view(request):
    data = request.data
    try:
        lat = float(data["lat"])
        lon = float(data["lon"])
        radius_km = float(data.get("radius_km", 25))
        result = execute_proximity_query(
            lat=lat,
            lon=lon,
            radius_km=radius_km,
            q=data.get("q", "*:*"),
            fq=data.get("fq", []),
            sort=data.get("sort", "geodist() asc"),
            rows=data.get("rows", 150),
            include_facets=data.get("include_facets", True),
        )
        return Response(result)
    except (KeyError, TypeError, ValueError) as exc:
        return Response({"error": f"Parámetros inválidos: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
    except requests.RequestException as exc:
        return _solr_error_response(exc)


@api_view(["POST"])
def polygon_view(request):
    data = request.data
    try:
        coordinates = data["coordinates"]
        result = execute_polygon_query(
            coordinates=coordinates,
            q=data.get("q", "*:*"),
            fq=data.get("fq", []),
            sort=data.get("sort", "anio desc"),
            rows=data.get("rows", 150),
            include_facets=data.get("include_facets", True),
        )
        return Response(result)
    except (KeyError, TypeError, ValueError) as exc:
        return Response({"error": f"Polígono inválido: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
    except requests.RequestException as exc:
        return _solr_error_response(exc)
