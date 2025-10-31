from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.extract import (
    CustomerExtractRequest,
    CustomerExtractResponse,
    ProductItem,
)
from app.services.agent import extract_products
from app.services.amazon import search_amazon, build_affiliate_link
from app.services.search_agent import find_amazon_link_with_title


router = APIRouter()


def _process_transcript(transcript: str) -> List[ProductItem]:
    if not transcript or not transcript.strip():
        raise HTTPException(status_code=400, detail="transcript is required")

    products = extract_products(transcript)
    if not products:
        raise HTTPException(status_code=400, detail="No products found in transcript")

    results: List[ProductItem] = []
    for product in products:
        # Try search agent first to reduce scraping
        try:
            asin, url, result_title = find_amazon_link_with_title(product)
            affiliate = build_affiliate_link(asin)
            results.append(ProductItem(product_name=product, affiliate_link=affiliate))
            continue
        except Exception:
            pass

        # Fall back to scraper which returns title reliably
        try:
            asin, title = search_amazon(product)
            affiliate = build_affiliate_link(asin)
            results.append(ProductItem(product_name=product, affiliate_link=affiliate))
        except Exception:
            # Skip products that fail both methods
            continue

    if not results:
        raise HTTPException(status_code=502, detail="Failed to resolve any products")

    return results


@router.post("/extract", response_model=CustomerExtractResponse)
def extract_endpoint(payload: CustomerExtractRequest) -> CustomerExtractResponse:
    items = _process_transcript(payload.transcript)
    return CustomerExtractResponse(
        customer_id=payload.customer_id,
        customer_name=payload.customer_name,
        product_list=items,
    )


