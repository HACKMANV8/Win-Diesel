import { useCallback, useMemo, useState } from "react";
import {
  appendLinksToTwitterPost,
  ProductLink,
  getTwitterEditorContent,
} from "@lib/twitterDom";
import { createLinksForDevto } from "@lib/api";

export default function TwitterTestPanel() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductLink[]>([]);

  const linkProducts = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    setProducts([]);

    try {
      // Get editor content
      const postContent = getTwitterEditorContent();
      if (!postContent.trim()) {
        setStatus("Post is empty");
        setTimeout(() => setStatus(null), 2000);
        setLoading(false);
        return;
      }

      // Call backend API (reusing the same endpoint as Dev.to)
      const response = await createLinksForDevto({
        transcript: postContent,
        customer_id: "CUST006",
        customer_name: "Anu",
      });

      // Convert API response to ProductLink format (using custom_link)
      const productLinks: ProductLink[] = response.products.map((p) => ({
        product_name: p.product_name,
        custom_link: p.custom_link,
      }));

      // Append links to the end of the post
      const ok = appendLinksToTwitterPost(productLinks);

      if (ok) {
        setStatus(`Appended ${productLinks.length} product link(s)`);
        setProducts(productLinks);
      } else {
        setStatus("Editor not found");
      }
    } catch (error: any) {
      setStatus(error?.message || "API call failed");
      console.error("Failed to create links:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 3000);
    }
  }, []);

  const body = useMemo(
    () => (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Twitter/X Test</div>
          {status && <span className="affilink-badge">{status}</span>}
        </div>

        <button
          className="affilink-btn"
          onClick={linkProducts}
          disabled={loading}
        >
          {loading ? "Processing..." : "Append product links"}
        </button>
        <div className="text-xs text-gray-500">
          Sends your post content to backend, gets product links,
          and appends them at the end of your post.
        </div>
        {products.length > 0 && (
          <div className="text-xs text-gray-400 border-t pt-2">
            <div className="font-medium mb-1">Products linked:</div>
            {products.map((p, i) => (
              <div key={i} className="truncate" title={p.custom_link}>
                {p.product_name}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    [linkProducts, status, loading, products]
  );

  return <div className="affilink-panel">{body}</div>;
}

