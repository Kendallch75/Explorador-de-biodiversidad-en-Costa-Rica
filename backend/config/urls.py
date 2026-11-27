from django.urls import include, path

urlpatterns = [
    path("api/", include("solr_api.urls")),
]
