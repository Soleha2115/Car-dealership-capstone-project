import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import FileResponse, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from server.djangoapp.models import CarMake, CarModel


def home(request, page=None):
    if page:
        page_file = Path(settings.BASE_DIR) / "server" / "frontend" / "static" / page
        if page_file.exists():
            return FileResponse(page_file.open("rb"), content_type="text/html")
    app_file = Path(settings.BASE_DIR) / "server" / "frontend" / "dist" / "index.html"
    if app_file.exists():
        return FileResponse(app_file.open("rb"))
    return HttpResponse(
        "Frontend is not built yet. Run `cd server/frontend && npm install && npm run build`.",
        content_type="text/plain",
        status=503,
    )


def _json_body(request):
    if request.content_type == "application/json":
        return json.loads(request.body or b"{}")
    return request.POST


@csrf_exempt
@require_http_methods(["GET", "POST"])
def login_user(request):
    if request.method == "GET":
        return JsonResponse({"message": "POST username and password to log in."})
    data = _json_body(request)
    user = authenticate(request, username=data.get("username", ""), password=data.get("password", ""))
    if user is None:
        return JsonResponse({"error": "Invalid username or password."}, status=401)
    login(request, user)
    return JsonResponse({"userName": user.username, "message": "Logged in."})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def logout_user(request):
    logout(request)
    return JsonResponse({"message": "Logged out."})


@csrf_exempt
@require_http_methods(["POST"])
def register_user(request):
    try:
        data = _json_body(request)
        username = data.get("username", "").strip()
        password = data.get("password", "")
        email = data.get("email", "").strip()
        if not username or not password or not email:
            return JsonResponse({"error": "Username, email, and password are required."}, status=400)
        if User.objects.filter(username=username).exists():
            return JsonResponse({"error": "That username is already registered."}, status=409)
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=data.get("firstName", "").strip(),
            last_name=data.get("lastName", "").strip(),
        )
        login(request, user)
        return JsonResponse({"userName": user.username, "message": "Account created."}, status=201)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid request body."}, status=400)


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse({"authenticated": True, "userName": request.user.username})


@require_GET
def get_cars(request):
    if not CarMake.objects.exists():
        for make_name, models in {
            "Toyota": [("Camry", 2024), ("RAV4", 2023)],
            "Ford": [("Mustang", 2024), ("F-150", 2023)],
            "BMW": [("3 Series", 2024)],
        }.items():
            make = CarMake.objects.create(name=make_name)
            CarModel.objects.bulk_create(
                [CarModel(make=make, name=model_name, year=year) for model_name, year in models]
            )
    cars = [
        {
            "id": model.id,
            "make": model.make.name,
            "model": model.name,
            "year": model.year,
            "dealer": model.dealer,
            "image": model.image,
        }
        for model in CarModel.objects.select_related("make").all()
    ]
    return JsonResponse({"Cars": cars})


def _proxy(path, method="GET", payload=None):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        f"{settings.NODE_SERVICE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    try:
        with urlopen(request, timeout=5) as response:
            return JsonResponse(json.loads(response.read()), status=response.status, safe=False)
    except HTTPError as error:
        try:
            body = json.loads(error.read())
        except (json.JSONDecodeError, UnicodeDecodeError):
            body = {"error": "Dealer service returned an error."}
        return JsonResponse(body, status=error.code, safe=False)
    except (URLError, TimeoutError, json.JSONDecodeError):
        return JsonResponse({"error": "Dealer service is unavailable."}, status=502)


@require_GET
def get_dealers(request):
    return _proxy("/fetchDealers")


@require_GET
def get_dealers_by_state(request, state):
    return _proxy(f"/fetchDealers/{state}")


@require_GET
def get_dealer(request, dealer_id):
    return _proxy(f"/fetchDealer/{dealer_id}")


@require_GET
def get_reviews(request, dealer_id):
    return _proxy(f"/fetchReviews/dealer/{dealer_id}")


@csrf_exempt
@require_http_methods(["POST"])
def post_review(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to post a review."}, status=401)
    try:
        data = _json_body(request)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"error": "Invalid request body."}, status=400)
    data["username"] = request.user.username
    return _proxy("/addReview", method="POST", payload=data)