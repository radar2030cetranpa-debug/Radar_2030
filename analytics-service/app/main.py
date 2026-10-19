from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import dashboard

app = FastAPI(
    title="Radar 2030 Analytics API",
    description="Motor de Inteligência e Estatística do PETRANS / CETRAN-PA",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Radar 2030 Analytics API"}