from __future__ import annotations

import time
from typing import Tuple
import random

import httpx
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/129.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
}


def _get_text(root: "BeautifulSoup", selector: str) -> str | None:
    node = root.select_one(selector)
    if not node:
        return None
    text = node.get_text(strip=True)
    return text if text else None


def _is_sponsored(card: "BeautifulSoup") -> bool:
    possible_badge_selectors = [
        "span.s-label-popover-default",
        "span.puis-label-popover-default",
        "span.s-sponsored-label-text",
        "span.a-color-secondary",
        "span.a-color-base",
        "span.puis-badge-text",
    ]
    for sel in possible_badge_selectors:
        node = card.select_one(sel)
        if not node:
            continue
        text = node.get_text(strip=True)
        if text and "sponsored" in text.lower():
            return True

    aria_nodes = card.select('[aria-label]')
    for n in aria_nodes:
        aria = n.get("aria-label", "").strip().lower()
        if aria == "sponsored" or aria.startswith("sponsored"):
            return True

    return False


def search_amazon(query: str) -> Tuple[str, str]:
    url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"

    last_exc: Exception | None = None
    for attempt in range(5):
        try:
            with httpx.Client(timeout=httpx.Timeout(10.0)) as client:
                res = client.get(url, headers=DEFAULT_HEADERS)
                # Retry on transient 5xx without raising immediately
                if 500 <= res.status_code < 600:
                    raise httpx.HTTPStatusError(
                        f"Server error '{res.status_code}' for url '{url}'",
                        request=res.request,
                        response=res,
                    )
                res.raise_for_status()

            if "captcha" in res.text.lower() or "Enter the characters" in res.text:
                raise RuntimeError("Blocked by CAPTCHA")

            soup = BeautifulSoup(res.text, "html.parser")

            results = soup.select('div.s-main-slot div[data-component-type="s-search-result"][data-asin]')
            if not results:
                raise RuntimeError("No product found")

            def extract_title(card: "BeautifulSoup") -> str | None:
                anchor = card.select_one("h2 a")
                candidates = [
                    (anchor.get("aria-label") if anchor else None),
                    _get_text(card, "span.a-size-medium.a-color-base.a-text-normal"),
                    _get_text(card, "span.a-size-base-plus.a-color-base.a-text-normal"),
                    _get_text(card, "h2 a span"),
                    _get_text(card, "h2"),
                    (card.select_one("img.s-image").get("alt") if card.select_one("img.s-image") else None),
                ]
                return next((t for t in candidates if t), None)

            for card in results:
                asin = card.get("data-asin", "").strip()
                if not asin:
                    continue
                if _is_sponsored(card):
                    continue
                title = extract_title(card)
                if title:
                    return asin, title

            first = results[0]
            asin = first.get("data-asin", "").strip()
            return asin, "Unknown Product"
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt < 4:
                # exponential backoff with jitter
                base = 1.0 * (2 ** attempt)
                jitter = random.uniform(0.2, 0.6)
                time.sleep(base + jitter)
            else:
                break

    raise RuntimeError(f"Failed to search Amazon: {last_exc}")


def build_affiliate_link(asin: str, tag: str = "shivanshkaran-21", anu_id: str = "anu-id") -> str:
    return f"https://www.amazon.in/dp/{asin}?tag={tag}&ascsubtag={anu_id}"



