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


