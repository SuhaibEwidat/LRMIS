from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import application_router, staff, survey, registrar, auth, analytics_router


app = FastAPI(
    title="LRMIS Backend",
    description="Land Registration Management Information System",
    version="1.0.0"
)


# Allow frontend React to connect with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # during development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(application_router.router)
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(survey.router)
app.include_router(registrar.router)
app.include_router(analytics_router.router)


@app.get("/")
def root():
    return {
        "message": "LRMIS Backend is running"
    }