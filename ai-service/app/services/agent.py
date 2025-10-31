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
        "You read casual speech and output only product names in a JSON list. "
        "Be concise (drop filler, remove superlatives), keep the canonical product name. "
        "Do not include URLs. Include specific models when present. Deduplicate."
    )

    prompt = (
        f"{system_instructions}\n\nTranscript:\n{transcript}\n\n"
        "Return only the structured list of product names."
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


