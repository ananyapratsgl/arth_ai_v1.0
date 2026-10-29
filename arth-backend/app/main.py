from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(
    title="ARTH API",
    description=(
        "Backend foundation for ARTH, a medical-document explanation prototype. "
        "Not a diagnostic service."
    ),
    version="0.1.0",
)

# Allow the local Next.js frontend to connect to the backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://radiant-pavlova-e06427.netlify.app",
],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["meta"])
def root():
    return {"app": "ARTH API", "status": "running", "docs": "/docs"}