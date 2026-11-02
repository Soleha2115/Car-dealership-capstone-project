from django.contrib.auth.models import User
from django.test import TestCase


class DealershipApiTests(TestCase):
    def test_register_creates_and_authenticates_user(self):
        response = self.client.post(
            "/djangoapp/register",
            {
                "username": "roadtest",
                "firstName": "Road",
                "lastName": "Tester",
                "email": "roadtest@example.com",
                "password": "DriveSafe!2026",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username="roadtest").exists())
        self.assertEqual(self.client.get("/djangoapp/user").json()["userName"], "roadtest")

    def test_duplicate_registration_is_rejected(self):
        User.objects.create_user(username="taken", password="DriveSafe!2026")

        response = self.client.post(
            "/djangoapp/register",
            {"username": "taken", "email": "taken@example.com", "password": "DriveSafe!2026"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)

    def test_get_cars_returns_seeded_makes_and_models(self):
        response = self.client.get("/djangoapp/get_cars")

        self.assertEqual(response.status_code, 200)
        cars = response.json()["Cars"]
        self.assertTrue(any(car["make"] == "Toyota" for car in cars))
        self.assertTrue(all("model" in car and "year" in car for car in cars))

    def test_review_submission_requires_login(self):
        response = self.client.post(
            "/djangoapp/post_review",
            {"dealerId": "1", "review": "Helpful team", "rating": 5},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)