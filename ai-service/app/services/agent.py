from __future__ import annotations

from typing import List

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from dotenv import load_dotenv

load_dotenv()


class ProductList(BaseModel):
    products: List[str] = Field(
        default_factory=list,
        description="Distinct product names mentioned in the transcript. Short, search-ready names.",
    )


def extract_products(transcript: str) -> list[str]:
    """Extract product names from a casual transcript using Gemini with structured output."""
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0,
    )
    as_products = model.with_structured_output(ProductList)

    system_instructions = (
    "You are a highly precise product name extraction expert. "
    "Your goal is to extract ONLY actual, commercially searchable product names as they appear in the text.\n\n"
    "### STRICT RULES:\n"
    "1. Extract only **specific, market-listed products** — include brand, model, generation, variant, or capacity.\n"
    "2. Always prefer **retail-ready names** (those that would appear as product titles on Amazon, Flipkart, etc.).\n"
    "3. If a product is misspelled, correct it **to the most likely valid market name** (e.g., 'macknook air m4' → 'MacBook Air M4').\n"
    "4. Keep product identifiers such as sizes, versions, storage (e.g., '256GB'), or generation tags.\n"
    "5. Never output generic or descriptive terms like 'laptop', 'headphones', or 'Apple customer care'.\n"
    "6. Never extract company names alone (e.g., 'Apple', 'Samsung') unless paired with a product.\n"
    "7. Never extract service names, support links, URLs, or problem descriptions.\n"
    "8. Return **only unique, valid product names** that could yield accurate results in a web search.\n"
    "9. If no real product name is mentioned, return an empty list.\n\n"
    "### OUTPUT REQUIREMENTS:\n"
    "- Each product name should be cleaned, standardized, and formatted exactly as it appears commercially.\n"
    "- Keep capitalization as in official branding (e.g., 'iPhone 15 Pro Max', not 'iphone 15 pro max').\n\n"
    "### EXAMPLES:\n"
    "- 'I bought the macknook air m4 yesterday' → ['MacBook Air M4']\n"
    "- 'The Sony WH-1000XM5 are my favorite' → ['Sony WH-1000XM5']\n"
    "- 'I use AirPods Pro second gen daily' → ['AirPods Pro 2nd Gen']\n"
    "- 'My new Dell Inspiron 14 5000 is amazing' → ['Dell Inspiron 14 5000']\n"
    "- 'Got a Samsung TV' → [] (too generic)\n"
    "- 'Facing issue with my Apple MacBook Air support' → ['MacBook Air'] (ignore 'support')"
)


    prompt = (
        f"{system_instructions}\n\n"
        f"TEXT TO ANALYZE:\n{transcript}\n\n"
        "Extract only the concrete product names mentioned:"
    )

    result: ProductList = as_products.invoke(prompt)
    # Normalize/clean
    cleaned = [p.strip() for p in result.products if p and p.strip()]
    # De-duplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for name in cleaned:
        low = name.lower()
        if low in seen:
            continue
        seen.add(low)
        unique.append(name)
    return unique


