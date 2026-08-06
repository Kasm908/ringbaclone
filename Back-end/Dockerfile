FROM python:3.12-slim-bookworm

WORKDIR /app

ENV SB_SKIP_BROWSER_INSTALL=1
ENV SELENIUMBASE_NO_BROWSER_INSTALL=1
ENV PYTHONUNBUFFERED=1

# Tesseract for the OCR fallback. Chromium itself is provided by Playwright
# (installed below) — the apt chromium is not what Playwright launches.
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

# Download Playwright's pinned Chromium + its system libraries. Without this the
# scan subprocess dies at launch with "Executable doesn't exist / run playwright
# install", which surfaces as every URL reporting "Scan did not complete".
RUN playwright install --with-deps chromium

COPY . .

EXPOSE 10000

CMD python manage.py migrate && python manage.py collectstatic --no-input && daphne -p $PORT -b 0.0.0.0 core.asgi:application