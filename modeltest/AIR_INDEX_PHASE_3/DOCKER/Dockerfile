FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV APP_ENV=PRODUCTION
ENV COLLECTION_MODE=live
CMD ["python","-m","PIPELINE.run_collection"]
