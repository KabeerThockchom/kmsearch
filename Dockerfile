FROM python:3.9

WORKDIR /app

COPY requirements.txt .
COPY app/dist /app/dist/
COPY app/backend.py .
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=10000

CMD ["python", "backend.py"]

