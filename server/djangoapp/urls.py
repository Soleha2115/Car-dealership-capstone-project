from django.urls import path

from server.djangoapp import views


urlpatterns = [
    path("login", views.login_user, name="login"),
    path("logout", views.logout_user, name="logout"),
    path("register", views.register_user, name="register"),
    path("get_cars", views.get_cars, name="get_cars"),
    path("get_dealers", views.get_dealers, name="get_dealers"),
    path("get_dealers/<str:state>", views.get_dealers_by_state, name="get_dealers_by_state"),
    path("get_dealer/<str:dealer_id>", views.get_dealer, name="get_dealer"),
    path("get_reviews/<str:dealer_id>", views.get_reviews, name="get_reviews"),
    path("post_review", views.post_review, name="post_review"),
    path("user", views.current_user, name="current_user"),
]