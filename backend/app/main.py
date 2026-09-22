from fastapi import FastAPI

app = FastAPI(title="Winbest Back-Office API")


@app.get("/health")
def health():
    return {"status": "ok"}
