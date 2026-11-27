from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIClient

from .presets import PRESET_QUERIES
from .solr_client import build_polygon_wkt, build_solr_params, format_solr_response


class SolrClientUnitTests(SimpleTestCase):
    def test_build_polygon_wkt_closes_ring(self):
        coords = [[-85.0, 10.5], [-84.5, 10.5], [-84.5, 10.0]]
        wkt = build_polygon_wkt(coords)
        self.assertEqual(wkt, "POLYGON((-85.0 10.5, -84.5 10.5, -84.5 10.0, -85.0 10.5))")

    def test_build_polygon_wkt_rejects_fewer_than_three_vertices(self):
        with self.assertRaises(ValueError):
            build_polygon_wkt([[-85.0, 10.5], [-84.5, 10.5]])

    def test_build_solr_params_includes_all_facet_types(self):
        params = build_solr_params(q="orden:Coleoptera", fq=["en_asp:true"], include_facets=True)
        self.assertEqual(params["facet"], "true")
        self.assertIn("orden", params["facet.field"])
        self.assertIn("anio", params["facet.range"])
        self.assertIn("en_asp:true", params["facet.query"])
        self.assertIn("json.facet", params)

    def test_format_solr_response_parses_facets_and_docs(self):
        mock_raw = {
            "responseHeader": {"QTime": 12},
            "response": {"numFound": 2, "start": 0, "docs": [{"id": "1"}, {"id": "2"}]},
            "facet_counts": {
                "facet_fields": {"orden": ["Coleoptera", 120, "Diptera", 80]},
                "facet_ranges": {"anio": {"start": 1950, "end": 2030, "gap": 10, "counts": ["1990", 50]}},
                "facet_queries": {"en_asp:true": 90},
            },
            "facets": {
                "por_provincia_y_orden": {"buckets": [{"val": "Guanacaste", "count": 100}]},
                "stats_por_area_conservacion": {"buckets": [{"val": "ACG", "count": 60, "elevacion_prom": 320.5}]},
            },
        }
        parsed = format_solr_response(mock_raw, {"q": "*:*"})
        self.assertEqual(parsed["numFound"], 2)
        self.assertEqual(parsed["facets"]["field_facets"]["orden"][0]["value"], "Coleoptera")
        self.assertEqual(parsed["facets"]["nested"][0]["val"], "Guanacaste")
        self.assertEqual(parsed["facets"]["stats"][0]["elevacion_prom"], 320.5)


class ApiEndpointsTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()

    def test_presets_endpoint_has_at_least_13_queries(self):
        resp = self.client.get("/api/presets/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.data["presets"]), 13)
        self.assertEqual(len(PRESET_QUERIES), len(resp.data["presets"]))

    @patch("solr_api.solr_client.execute_solr_select")
    def test_polygon_endpoint_builds_intersects_wkt(self, mock_select):
        mock_select.return_value = {"numFound": 5, "docs": [], "facets": {}, "solrParams": {}}
        resp = self.client.post(
            "/api/geo/polygon/",
            {
                "coordinates": [[-85.0, 10.5], [-84.5, 10.5], [-84.5, 10.0]],
                "include_facets": True,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        sent_fq = mock_select.call_args[0][0]["fq"][0]
        self.assertTrue(sent_fq.startswith('location:"Intersects(POLYGON('))

    @patch("solr_api.views.autocomplete_species")
    def test_autocomplete_endpoint(self, mock_auto):
        mock_auto.return_value = [{"especie": "Morpho helenor", "count": 9}]
        resp = self.client.get("/api/autocomplete/?q=Morpho")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["suggestions"][0]["especie"], "Morpho helenor")
