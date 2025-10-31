from __future__ import annotations

import os
import re
from typing import Optional, Tuple

from dotenv import load_dotenv
from tavily import TavilyClient


load_dotenv()


ASIN_REGEX = re.compile(r"/(?:dp|gp/product)/([A-Z0-9]{10})(?:[/?]|$)")


def _extract_asin(url: str) -> Optional[str]:
    match = ASIN_REGEX.search(url)
    if not match:
        return None
    return match.group(1)


def find_amazon_link(product_name: str, country_domain: str = "amazon.in") -> Tuple[str, str]:
    """
    Use Tavily Search API to find an Amazon product link for the given product name.
    Returns (asin, url). Raises RuntimeError if not found.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not set")

    client = TavilyClient(api_key=api_key)

    query = (
        f"site:{country_domain} (\"dp\" OR \"gp/product\") \"{product_name}\" -renew -refurbished"
    )
    resp = client.search(query=query, max_results=10)

    # Tavily returns { results: [{url, title, content, ...}, ...] }
    for item in resp.get("results", []):
        url = item.get("url")
        if not url:
            continue
        if country_domain not in url:
            continue
        asin = _extract_asin(url)
        if asin:
            return asin, url

    # Try a looser pass without quotes if strict search failed
    query2 = f"site:{country_domain} dp {product_name}"
    resp2 = client.search(query=query2, max_results=10)
    for item in resp2.get("results", []):
        url = item.get("url")
        if not url:
            continue
        if country_domain not in url:
            continue
        asin = _extract_asin(url)
        if asin:
            return asin, url

    raise RuntimeError(f"No Amazon link found for: {product_name}")


def find_amazon_link_with_title(product_name: str, country_domain: str = "amazon.in") -> Tuple[str, str, Optional[str]]:
    """
    Use Tavily Search API to find an Amazon product link for the given product name.
    Returns (asin, url, title). Raises RuntimeError if not found.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not set")

    client = TavilyClient(api_key=api_key)

    query = (
        f"site:{country_domain} (\"dp\" OR \"gp/product\") \"{product_name}\" -renew -refurbished"
    )
    resp = client.search(query=query, max_results=10)

    for item in resp.get("results", []):
        url = item.get("url")
        if not url:
            continue
        if country_domain not in url:
            continue
        asin = _extract_asin(url)
        if asin:
            return asin, url, item.get("title")

    # Looser pass
    query2 = f"site:{country_domain} dp {product_name}"
    resp2 = client.search(query=query2, max_results=10)
    for item in resp2.get("results", []):
        url = item.get("url")
        if not url:
            continue
        if country_domain not in url:
            continue
        asin = _extract_asin(url)
        if asin:
            return asin, url, item.get("title")

    raise RuntimeError(f"No Amazon link found for: {product_name}")


