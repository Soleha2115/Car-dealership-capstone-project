FROM node:18-alpine AS frontend
WORKDIR /app
COPY server/frontend/package*.json ./
RUN npm install
COPY server/frontend/ ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=frontend /app/dist ./server/frontend/dist
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate && gunicorn server.djangoproj.wsgi:application --bind 0.0.0.0:8000"]