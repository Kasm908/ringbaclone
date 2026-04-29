FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN playwright install chromium
RUN python manage.py collectstatic --no-input

EXPOSE 10000

CMD python manage.py migrate && daphne -p $PORT -b 0.0.0.0 core.asgi:application