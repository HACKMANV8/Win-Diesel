"""
External request service for calling the Go affiliate backend.

This service orchestrates two API calls:
1. POST /api/custom-affiliate/create - Creates custom short links and stores in Redis
2. POST /api/markdown/affiliate - Injects affiliate links into markdown content
"""

from __future__ import annotations

import os
from typing import List

import httpx
from pydantic import BaseModel


class ProductRequest(BaseModel):
    """Product with affiliate link for creating custom links."""
    product_name: str
    affiliate_link: str


class ProductResponse(BaseModel):
    """Product with generated custom link."""
    product_name: str
    custom_link: str


class CreateAffiliateLinksRequest(BaseModel):
    """Request to create custom affiliate links in Go backend."""
    customer_id: str
    customer_name: str
    product_list: List[ProductRequest]


class CreateAffiliateLinksResponse(BaseModel):
    """Response from Go backend with custom links."""
    customer_id: str
    customer_name: str
    products: List[ProductResponse]


class MarkdownAffiliateRequest(BaseModel):
    """Request to inject affiliate links into markdown."""
    content: str
    products: List[ProductResponse]
    use_gemini: bool = False


class MarkdownAffiliateResponse(BaseModel):
    """Response with markdown content containing affiliate links."""
    content: str


class AffiliateBackendClient:
    """Client for interacting with the Go affiliate backend."""

    def __init__(self, base_url: str | None = None, timeout: float = 30.0):
        """
        Initialize the affiliate backend client.

        Args:
            base_url: Base URL of the Go backend (defaults to GO_BACKEND_URL env or http://localhost:8080)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv("GO_BACKEND_URL", "http://localhost:8080")
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.close()

    def create_custom_links(
        self,
        customer_id: str,
        customer_name: str,
        products: List[ProductRequest],
    ) -> CreateAffiliateLinksResponse:
        """
        Call Go backend to create custom short links for products.

        Args:
            customer_id: Unique customer identifier
            customer_name: Customer name
            products: List of products with affiliate links

        Returns:
            Response containing custom links for each product

        Raises:
            httpx.HTTPStatusError: If the API returns an error status
            httpx.RequestError: If the request fails
        """
        url = f"{self.base_url}/api/custom-affiliate/create"
        payload = CreateAffiliateLinksRequest(
            customer_id=customer_id,
            customer_name=customer_name,
            product_list=products,
        )

        response = self.client.post(
            url,
            json=payload.model_dump(),
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        return CreateAffiliateLinksResponse(**response.json())

    def inject_affiliate_links(
        self,
        content: str,
        products: List[ProductResponse],
        use_gemini: bool = False,
    ) -> MarkdownAffiliateResponse:
        """
        Call Go backend to inject affiliate links into markdown content.

        Args:
            content: Original markdown content
            products: List of products with custom links
            use_gemini: Whether to use Gemini AI for smart link injection

        Returns:
            Response containing modified markdown with affiliate links

        Raises:
            httpx.HTTPStatusError: If the API returns an error status
            httpx.RequestError: If the request fails
        """
        url = f"{self.base_url}/api/markdown/affiliate"
        payload = MarkdownAffiliateRequest(
            content=content,
            products=products,
            use_gemini=use_gemini,
        )

        response = self.client.post(
            url,
            json=payload.model_dump(),
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        return MarkdownAffiliateResponse(**response.json())

    def process_content_with_affiliates(
        self,
        customer_id: str,
        customer_name: str,
        content: str,
        products: List[ProductRequest],
        use_gemini: bool = False,
    ) -> str:
        """
        Complete workflow: create custom links and inject them into content.

        This is a convenience method that chains both API calls:
        1. Creates custom short links for products
        2. Injects those links into the markdown content

        Args:
            customer_id: Unique customer identifier
            customer_name: Customer name
            content: Original markdown content
            products: List of products with affiliate links
            use_gemini: Whether to use Gemini AI for smart link injection

        Returns:
            Modified markdown content with affiliate links injected

        Raises:
            httpx.HTTPStatusError: If any API returns an error status
            httpx.RequestError: If any request fails
        """
        # Step 1: Create custom links
        custom_links_response = self.create_custom_links(
            customer_id=customer_id,
            customer_name=customer_name,
            products=products,
        )

        # Step 2: Inject links into content
        markdown_response = self.inject_affiliate_links(
            content=content,
            products=custom_links_response.products,
            use_gemini=use_gemini,
        )

        return markdown_response.content

    def close(self):
        """Close the HTTP client."""
        self.client.close()
