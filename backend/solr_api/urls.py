from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health_view, name="health"),
    path("presets/", views.presets_view, name="presets"),
    path("autocomplete/", views.autocomplete_view, name="autocomplete"),
    path("query/", views.query_view, name="query"),
    path("geo/proximity/", views.proximity_view, name="geo-proximity"),
    path("geo/polygon/", views.polygon_view, name="geo-polygon"),
]
