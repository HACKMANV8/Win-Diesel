from __future__ import annotations

from typing import List

from pydantic import BaseModel


class ExtractRequest(BaseModel):
    transcript: str


class ProductItem(BaseModel):
    product_name: str
    affiliate_link: str


class CustomerExtractRequest(BaseModel):
    transcript: str
    customer_id: str
    customer_name: str


class CustomerExtractResponse(BaseModel):
    customer_id: str
    customer_name: str
    product_list: List[ProductItem]


class ProcessContentRequest(BaseModel):
    """Request to extract products from transcript and inject links into content."""
    transcript: str
    customer_id: str
    customer_name: str
    use_gemini: bool = False


class ProcessContentResponse(BaseModel):
    """Response with markdown content containing affiliate links."""
    customer_id: str
    customer_name: str
    content: str
    products_found: int


class CreateLinksRequest(BaseModel):
    """Request to extract products and create custom links only (no injection)."""
    transcript: str
    customer_id: str
    customer_name: str


class ProductWithCustomLink(BaseModel):
    """Product with both affiliate link and custom link."""
    product_name: str
    affiliate_link: str
    custom_link: str


class CreateLinksResponse(BaseModel):
    """Response with custom links created but no content injection."""
    customer_id: str
    customer_name: str
    products: List[ProductWithCustomLink]


