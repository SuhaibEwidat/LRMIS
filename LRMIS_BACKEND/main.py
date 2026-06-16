from fastapi import FastAPI
from .routers import application_router

app = FastAPI(title="LRMIS System")

app.include_router(application_router.router)


@app.get("/")
def root():
    return {"message": "LRMIS API Running 🚀"}