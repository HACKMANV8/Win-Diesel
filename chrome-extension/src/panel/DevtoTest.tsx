import { useCallback, useMemo, useState } from "react";
import { replaceProductsWithLinks, ProductLink } from "@lib/devtoDom";

// Hardcoded API response for testing
const HARDCODED_API_RESPONSE = {
  customer_id: "CUST001",
  customer_name: "John Doe",
  products: [
    {
      product_name: "iPhone 15 Pro",
      custom_link: "https://1afe71742170.ngrok-free.app/CUST001/iphone-15-pro",
    },
    {
      product_name: "MacBook Pro M3",
      custom_link: "https://1afe71742170.ngrok-free.app/CUST001/macbook-pro-m3",
    },
    {
      product_name: "AirPods Pro",
      custom_link: "https://1afe71742170.ngrok-free.app/CUST001/airpods-pro",
    },
  ] as ProductLink[],
};

export default function DevtoTestPanel() {
  const [status, setStatus] = useState<string | null>(null);

  const replaceProducts = useCallback(() => {
    const ok = replaceProductsWithLinks(HARDCODED_API_RESPONSE.products);
    setStatus(
      ok
        ? `Replaced ${HARDCODED_API_RESPONSE.products.length} products`
        : "Editor not found"
    );
    setTimeout(() => setStatus(null), 2000);
  }, []);

  const body = useMemo(
    () => (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">DEV.to Writer Test</div>
          {status && <span className="affilink-badge">{status}</span>}
        </div>

        <button className="affilink-btn" onClick={replaceProducts}>
          Link products
        </button>
        <div className="text-xs text-gray-500">
          Finds product names in the article (case-insensitive, handles bold)
          and replaces them with markdown links.
        </div>
        <div className="text-xs text-gray-400 border-t pt-2">
          <div className="font-medium mb-1">Products:</div>
          {HARDCODED_API_RESPONSE.products.map((p, i) => (
            <div key={i} className="truncate" title={p.custom_link}>
              {p.product_name}
            </div>
          ))}
        </div>
      </div>
    ),
    [replaceProducts, status]
  );

  return <div className="affilink-panel">{body}</div>;
}
