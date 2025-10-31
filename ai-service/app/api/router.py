from fastapi import APIRouter

from app.api.endpoints.extract import router as extract_router


api_router = APIRouter()

# Group extract-related endpoints
api_router.include_router(extract_router, tags=["extract"])


