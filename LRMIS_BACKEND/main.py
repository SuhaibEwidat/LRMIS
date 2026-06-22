import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import application_router, staff, survey, registrar, auth, analytics_router


app = FastAPI(
    title="LRMIS Backend",
    description="Land Registration Management Information System",
    version="1.0.0"
)


# =========================
# Uploads Folder Setup
# =========================
UPLOAD_DIR = "uploads"

# Create uploads folder if it does not exist
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve uploaded files
# Example:
# http://127.0.0.1:8000/uploads/file_name.pdf
app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
)


# =========================
# CORS Middleware
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Routers
# =========================
app.include_router(application_router.router)
app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(survey.router)
app.include_router(registrar.router)
app.include_router(analytics_router.router)

# =========================
# Root Endpoint
# =========================
@app.get("/")
def root():
    return {
        "message": "LRMIS Backend is running"
    }