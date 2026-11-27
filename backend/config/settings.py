import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-bd2-insectos-asp-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "solr_api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {}

CORS_ALLOW_ALL_ORIGINS = True

REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": None,
}

LANGUAGE_CODE = "es-cr"
TIME_ZONE = "America/Costa_Rica"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"

SOLR_BASE_URL = os.environ.get("SOLR_BASE_URL", "http://localhost:8983/solr")
SOLR_CORE = os.environ.get("SOLR_CORE", "insectos_asp")
