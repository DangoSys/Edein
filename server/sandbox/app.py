from fastapi import FastAPI

app = FastAPI(title="Edein Sandbox", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/hello")
def hello() -> dict:
    return {"message": "hello world from buckyball sandbox"}
