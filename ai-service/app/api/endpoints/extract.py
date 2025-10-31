from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.schemas.extract import (
    CustomerExtractRequest,
    CustomerExtractResponse,
    ProductItem,
    ProcessContentRequest,
    ProcessContentResponse,
    CreateLinksRequest,
    CreateLinksResponse,
    ProductWithCustomLink,
)
from app.services.agent import extract_products
from app.services.amazon import search_amazon, build_affiliate_link
from app.services.search_agent import find_amazon_link_with_title
from app.services.external_request import AffiliateBackendClient, ProductRequest


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


@router.post("/process-content", response_model=ProcessContentResponse)
def process_content_endpoint(payload: ProcessContentRequest) -> ProcessContentResponse:
    """
    Complete workflow endpoint:
    1. Extract products from transcript using Gemini
    2. Find affiliate links for products on Amazon
    3. Call Go backend to create custom short links
    4. Call Go backend to inject those links into markdown content

    This endpoint orchestrates the entire affiliate link injection pipeline.
    """
    # Step 1: Extract products from transcript
    items = _process_transcript(payload.transcript)

    if not items:
        raise HTTPException(status_code=400, detail="No products found in transcript")

    # Step 2: Convert to ProductRequest format for Go backend
    product_requests = [
        ProductRequest(
            product_name=item.product_name,
            affiliate_link=item.affiliate_link,
        )
        for item in items
    ]

    # Step 3 & 4: Call Go backend to create links and inject into content (using transcript as content)
    try:
        with AffiliateBackendClient() as client:
            modified_content = client.process_content_with_affiliates(
                customer_id=payload.customer_id,
                customer_name=payload.customer_name,
                content=payload.transcript,
                products=product_requests,
                use_gemini=payload.use_gemini,
            )

        return ProcessContentResponse(
            customer_id=payload.customer_id,
            customer_name=payload.customer_name,
            content=modified_content,
            products_found=len(items),
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to process content with Go backend: {str(e)}",
        )


@router.post("/create-links", response_model=CreateLinksResponse)
def create_links_endpoint(payload: CreateLinksRequest) -> CreateLinksResponse:
    """
    Extract products and create custom links only (no markdown injection).
    
    Workflow:
    1. Extract products from transcript using Gemini
    2. Find affiliate links for products on Amazon
    3. Call Go backend to create custom short links
    4. Return the list of products with both affiliate and custom links
    """
    # Step 1: Extract products from transcript
    items = _process_transcript(payload.transcript)

    if not items:
        raise HTTPException(status_code=400, detail="No products found in transcript")

    # Step 2: Convert to ProductRequest format for Go backend
    product_requests = [
        ProductRequest(
            product_name=item.product_name,
            affiliate_link=item.affiliate_link,
        )
        for item in items
    ]

    # Step 3: Call Go backend to create custom links only
    try:
        with AffiliateBackendClient() as client:
            custom_links_response = client.create_custom_links(
                customer_id=payload.customer_id,
                customer_name=payload.customer_name,
                products=product_requests,
            )

        # Step 4: Build response with both affiliate and custom links
        products_with_links = [
            ProductWithCustomLink(
                product_name=items[i].product_name,
                affiliate_link=items[i].affiliate_link,
                custom_link=custom_links_response.products[i].custom_link,
            )
            for i in range(len(items))
        ]

        return CreateLinksResponse(
            customer_id=payload.customer_id,
            customer_name=payload.customer_name,
            products=products_with_links,
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create custom links with Go backend: {str(e)}",
        )


