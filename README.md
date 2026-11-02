# Car Dealership Capstone

IBM Full-Stack Developer capstone implementation by Soleha2115.

This repository contains a Django API and admin, a React dealership interface, a Node.js dealer/review service backed by MongoDB, and a Flask sentiment service. See the [setup and submission guide](README.md#run-locally) below.

## Run locally

Requirements: Python 3.11+, Node.js 18+, npm, and Docker with Compose. The easiest complete setup is:

```bash
docker compose up --build
```

Open <http://localhost:8000>. Django serves the React app and API; the Node service is available at port 3000, Flask at 5000, and MongoDB at 27017. Sample dealers are seeded automatically. To create an admin user:

```bash
docker compose exec django python manage.py createsuperuser
```

For host-based Django development (instead of the Compose Django container), use:

```bash
python -m venv djangoenv
source djangoenv/bin/activate
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

For development without Compose, start MongoDB and the Node service in a separate terminal (`cd server/database && npm install && npm start`), then start Flask (`cd server/djangoapp/microservices && pip install -r requirements.txt && python sentiment_analyzer.py`). Build the UI with `cd server/frontend && npm install && npm run build` before starting Django.

## Services and endpoints

- Django: `http://localhost:8000`; admin at `/admin`; API under `/djangoapp/`.
- Node: `GET /fetchDealers`, `GET /fetchDealers/:state`, `GET /fetchDealer/:id`, `GET /fetchReviews/dealer/:id`, `POST /addReview`.
- Flask: `POST /analyze` with `{"text":"Fantastic services"}`.
- Django API: login, logout, register, cars, dealers, reviews, and review submission.

## Submission guide

The source files and workflow are included. Run the application and capture actual output/screenshots yourself; this repo cannot fabricate authenticated sessions, GitHub Actions run logs, or a cloud deployment URL.

1. Publish the code to `https://github.com/Soleha2115/Car-dealership-capstone-project` and make it public if required. From the repository root, review the files, then run `git add .`, `git commit -m "Build dealership capstone"`, and `git push origin main`. Submit `https://github.com/Soleha2115/Car-dealership-capstone-project/blob/main/README.md`.
2. Install dependencies, run migrations, and start Django with `python manage.py runserver 2>&1 | tee django_server`. Submit the resulting `django_server` contents.
3. Submit the source URLs for [`server/frontend/static/About.html`](server/frontend/static/About.html), [`server/frontend/static/Contact.html`](server/frontend/static/Contact.html), and [`server/frontend/src/components/Register/Register.jsx`](server/frontend/src/components/Register/Register.jsx).
4. Create an admin user with `python manage.py createsuperuser`. For tasks 12–13, sign into `/admin` and capture `admin_login.png`, then log out and capture `admin_logout.png`. For tasks 14–15, use the admin **Car makes** and **Car models** screens to add makes/models; the API also seeds sample makes when initially empty.
5. Test login/logout using the commands below, replacing the placeholders with your own local credentials. Never commit the output files if they contain credentials or session cookies.

```bash
curl -c cookies.txt http://localhost:8000/djangoapp/login
curl -X POST http://localhost:8000/djangoapp/login -b cookies.txt -c cookies.txt \
	-d 'username=YOUR_USER&password=YOUR_PASSWORD' -v 2>&1 | tee loginuser
curl -X GET http://localhost:8000/djangoapp/logout -b cookies.txt -c cookies.txt \
	-v 2>&1 | tee logoutuser
```

6. With Node and MongoDB running, capture the requested service responses:

```bash
curl http://localhost:3000/fetchReviews/dealer/1 | tee getdealerreviews
curl http://localhost:3000/fetchDealers | tee getalldealers
curl http://localhost:3000/fetchDealer/1 | tee getdealerbyid
curl 'http://localhost:3000/fetchDealers/Kansas' | tee getdealersbyState
curl http://localhost:8000/djangoapp/get_cars | tee getallcarmakes
curl -X POST http://localhost:5000/analyze -H 'Content-Type: application/json' \
	-d '{"text":"Fantastic services"}' | tee analyzereview
```

7. For tasks 17–22, open the app in a browser and capture: `get_dealers.png` (logged out), `get_dealers_loggedin.png`, `dealersbystate.png` (select Kansas), `dealer_id_reviews.png` (open a dealer), `dealership_review_submission.png` (filled but not submitted), and `added_review.png` (after submission). Keep the address bar visible where the rubric requests it.
8. Task 23 is automated by [.github/workflows/linting.yml](.github/workflows/linting.yml). Push to GitHub, open **Actions**, and save the actual successful run log as `CICD`.
9. Tasks 24–28 need a cloud account and live services. A single Django image is not enough: deploy the Node service and connect it to hosted MongoDB, then configure Django with the Node service URL. The Code Engine outline below covers this. Save the real Django public URL as plain text in `deploymentURL`; capture `deployed_landingpage.png`, `deployed_loggedin.png`, `deployed_dealer_detail.png`, and `deployed_add_review.png` from that URL.

### IBM Cloud Code Engine outline

This outline requires IBM Cloud CLI, the Code Engine plugin, Container Registry access, and a MongoDB URI reachable from Code Engine (for example, a hosted MongoDB cluster). Never commit credentials or paste them into screenshots/logs.

1. Log in, select your region/resource group, create a registry namespace, and select a Code Engine project:

```bash
ibmcloud login -r us-south
ibmcloud target -g YOUR_RESOURCE_GROUP
ibmcloud plugin install code-engine
ibmcloud plugin install container-registry
ibmcloud cr namespace-add YOUR_NAMESPACE
ibmcloud cr login
ibmcloud ce project create --name dealership
ibmcloud ce project select --name dealership
```

2. Build and push all service images (the frontend is bundled in the Django image):

```bash
docker build -t us.icr.io/YOUR_NAMESPACE/dealership:latest .
docker build -t us.icr.io/YOUR_NAMESPACE/dealer-service:latest -f server/database/Dockerfile server/database
docker build -t us.icr.io/YOUR_NAMESPACE/sentiment:latest server/djangoapp/microservices
docker push us.icr.io/YOUR_NAMESPACE/dealership:latest
docker push us.icr.io/YOUR_NAMESPACE/dealer-service:latest
docker push us.icr.io/YOUR_NAMESPACE/sentiment:latest
```

3. In the Code Engine console, create a secret containing `MONGODB_URI`, then create the dealer service on port 3000 with that secret exposed as the `MONGODB_URI` environment variable. Create the sentiment service on port 5000. Read the dealer service's public URL from its application details.
4. Create the Django application on port 8000. Set `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS` to its public hostname, `NODE_SERVICE_URL` to the dealer service URL, and `DJANGO_SECRET_KEY` to a generated secret. Set minimum and maximum scale to 1 for the capstone demo. Do not use the development secret from `settings.py` in a public deployment.
5. Open the Django application URL and verify registration/login, dealers, filtering, and review submission before capturing tasks 25–28. Save the exact URL in `deploymentURL`.

Code Engine instances use ephemeral local storage by default. This SQLite setup is suitable for the course demonstration, but a production deployment should move Django user/car data to persistent managed storage. Docker Compose is for local testing, not public hosting.

The coursework checklist mentions 28 tasks. This repository provides their source-code components; screenshots, command transcripts, public links, and deployment artifacts are generated only after running the project in your own environment.