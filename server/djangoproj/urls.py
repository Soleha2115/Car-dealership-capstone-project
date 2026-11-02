from django.contrib import admin
from django.urls import include, path

from server.djangoapp.views import home


urlpatterns = [
    path("admin/", admin.site.urls),
    path("djangoapp/", include("server.djangoapp.urls")),
    path("about", home, {"page": "About.html"}, name="about"),
    path("contact", home, {"page": "Contact.html"}, name="contact"),
    path("", home, name="home"),
]