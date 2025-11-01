import React from "react";
import { createRoot } from "react-dom/client";
import App from "../panel/App";
import { linkProductsFromDevto } from "../lib/devtoDom";
import { isYouTubeUploadPage } from "../lib/youtubeDom";
import YouTubeTranscriptionPanel from "../panel/YouTubeTranscription";

function injectDevtoButton() {
  // Check if button already exists
  if (document.getElementById("devto-link-products-btn")) return;

  const button = document.createElement("button");
  button.id = "devto-link-products-btn";
  button.textContent = "Link products";
  button.type = "button";

  // Fixed position in top right corner with high z-index
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #3b49df;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: background-color 0.2s, transform 0.1s;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = "#2f3ab2";
    button.style.transform = "scale(1.05)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = "#3b49df";
    button.style.transform = "scale(1)";
  });

  let isLoading = false;
  button.addEventListener("click", async () => {
    if (isLoading) return;

    isLoading = true;
    button.disabled = true;
    button.textContent = "Processing...";
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";

    try {
      const result = await linkProductsFromDevto();

      // Brief success feedback
      if (result.success) {
        button.textContent = `✓ ${result.message}`;
        button.style.backgroundColor = "#00b894";
        setTimeout(() => {
          button.textContent = "Link products";
          button.style.backgroundColor = "#3b49df";
        }, 2000);
      } else {
        button.textContent = "✗ Failed";
        button.style.backgroundColor = "#ef4444";
        setTimeout(() => {
          button.textContent = "Link products";
          button.style.backgroundColor = "#3b49df";
        }, 2000);
      }
    } catch (error) {
      button.textContent = "✗ Error";
      button.style.backgroundColor = "#ef4444";
      setTimeout(() => {
        button.textContent = "Link products";
        button.style.backgroundColor = "#3b49df";
      }, 2000);
    } finally {
      isLoading = false;
      button.disabled = false;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  });

  // Append to body
  document.body.appendChild(button);
}

function mountYouTubePanel() {
  if (document.getElementById("youtube-transcription-panel-root")) {
    console.log("[YouTube Transcription] Panel already mounted");
    return;
  }

  console.log("[YouTube Transcription] Mounting panel on YouTube Studio");

  const container = document.createElement("div");
  container.id = "youtube-transcription-panel-root";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <YouTubeTranscriptionPanel />
    </React.StrictMode>
  );

  console.log("[YouTube Transcription] Panel mounted successfully");
}

function injectTwitterButton() {
  // Check if button already exists
  if (document.getElementById("twitter-link-products-btn")) return;

  const button = document.createElement("button");
  button.id = "twitter-link-products-btn";
  button.textContent = "Append product links";
  button.type = "button";

  // Fixed position in top right corner with high z-index
  button.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background-color: #1DA1F2;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: background-color 0.2s, transform 0.1s;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.backgroundColor = "#1a8cd8";
    button.style.transform = "scale(1.05)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.backgroundColor = "#1DA1F2";
    button.style.transform = "scale(1)";
  });

  let isLoading = false;
  let clickCount = 0;

  button.addEventListener("click", async () => {
    clickCount++;
    const currentClick = clickCount;

    console.log(
      `[Twitter Button] ########## BUTTON CLICK #${currentClick} ##########`
    );
    console.log(
      `[Twitter Button] CLICK #${currentClick}: isLoading =`,
      isLoading
    );

    if (isLoading) {
      console.log(
        `[Twitter Button] CLICK #${currentClick}: BLOCKED - Already processing`
      );
      return;
    }

    isLoading = true;
    button.disabled = true;
    button.textContent = "Processing...";
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";

    console.log(
      `[Twitter Button] CLICK #${currentClick}: Starting processing...`
    );

    try {
      // Import dynamically to avoid loading issues
      const { getTwitterEditorContent, appendLinksToTwitterPost } =
        await import("../lib/twitterDom");
      const { createLinksForDevto } = await import("../lib/api");

      console.log(
        `[Twitter Button] CLICK #${currentClick}: Getting editor content...`
      );
      const postContent = getTwitterEditorContent();
      console.log(
        `[Twitter Button] CLICK #${currentClick}: Post content length:`,
        postContent.length
      );

      if (!postContent.trim()) {
        console.log(`[Twitter Button] CLICK #${currentClick}: Post is empty`);
        button.textContent = "✗ Post is empty";
        button.style.backgroundColor = "#ef4444";
        setTimeout(() => {
          button.textContent = "Append product links";
          button.style.backgroundColor = "#1DA1F2";
        }, 2000);
        return;
      }

      console.log(`[Twitter Button] CLICK #${currentClick}: Calling API...`);
      const response = await createLinksForDevto({
        transcript: postContent,
        customer_id: "CUST006",
        customer_name: "Anu",
      });

      console.log(
        `[Twitter Button] CLICK #${currentClick}: API response:`,
        response
      );
      console.log(
        `[Twitter Button] CLICK #${currentClick}: Products count:`,
        response.products.length
      );

      // Deduplicate products by name (in case backend returns duplicates)
      const uniqueProducts = Array.from(
        new Map(
          response.products.map((p) => [p.product_name.toLowerCase(), p])
        ).values()
      );

      console.log(
        `[Twitter Button] CLICK #${currentClick}: Unique products count:`,
        uniqueProducts.length
      );

      const productLinks = uniqueProducts.map((p) => ({
        product_name: p.product_name,
        custom_link: p.custom_link,
      }));

      console.log(
        `[Twitter Button] CLICK #${currentClick}: Product links to append:`,
        productLinks
      );
      console.log(
        `[Twitter Button] CLICK #${currentClick}: Calling appendLinksToTwitterPost...`
      );

      const ok = appendLinksToTwitterPost(productLinks);

      console.log(
        `[Twitter Button] CLICK #${currentClick}: appendLinksToTwitterPost returned:`,
        ok
      );

      if (ok) {
        button.textContent = `✓ Appended ${productLinks.length} link(s)`;
        button.style.backgroundColor = "#00b894";
        setTimeout(() => {
          button.textContent = "Append product links";
          button.style.backgroundColor = "#1DA1F2";
        }, 3000);
      } else {
        button.textContent = "✗ Editor not found";
        button.style.backgroundColor = "#ef4444";
        setTimeout(() => {
          button.textContent = "Append product links";
          button.style.backgroundColor = "#1DA1F2";
        }, 2000);
      }
    } catch (error: any) {
      console.error("[Twitter] Failed to append links:", error);
      button.textContent = "✗ Error: " + (error?.message || "Failed");
      button.style.backgroundColor = "#ef4444";
      setTimeout(() => {
        button.textContent = "Append product links";
        button.style.backgroundColor = "#1DA1F2";
      }, 3000);
    } finally {
      isLoading = false;
      button.disabled = false;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  });

  // Append to body
  document.body.appendChild(button);
  console.log("[Twitter] Button injected successfully");
}

function isTwitterPage(): boolean {
  // Check for twitter.com or x.com
  const hostname = location.hostname.toLowerCase();
  return (
    hostname === "twitter.com" ||
    hostname === "x.com" ||
    hostname.includes("twitter.com") ||
    hostname.includes("x.com")
  );
}

function mountPanel() {
  const isDevto = location.hostname === "dev.to";
  const isYouTube = isYouTubeUploadPage();
  const isTwitter = isTwitterPage();

  console.log("[Content Script] Page detection:", {
    hostname: location.hostname,
    pathname: location.pathname,
    isDevto,
    isYouTube,
    isTwitter,
  });

  if (isDevto) {
    // For dev.to, inject button instead of React panel
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          // Wait a bit for dev.to to render
          setTimeout(injectDevtoButton, 300);
        },
        { once: true }
      );
    } else {
      setTimeout(injectDevtoButton, 300);
    }
  } else if (isYouTube) {
    // For YouTube Studio, inject transcription panel
    console.log("[Content Script] YouTube Studio detected, will mount panel");
    const mountWithRetry = (retries = 3) => {
      if (document.body && document.body.children.length > 0) {
        mountYouTubePanel();
      } else if (retries > 0) {
        console.log(
          `[Content Script] Body not ready, retrying in 500ms (${retries} retries left)`
        );
        setTimeout(() => mountWithRetry(retries - 1), 500);
      } else {
        console.error("[Content Script] Failed to mount panel after retries");
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          setTimeout(() => mountWithRetry(), 1000);
        },
        { once: true }
      );
    } else {
      setTimeout(() => mountWithRetry(), 1000);
    }
  } else if (isTwitter) {
    // For Twitter/X, inject button (similar to Dev.to)
    console.log("[Content Script] Twitter/X detected, will inject button");
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          // Wait a bit for Twitter to render (it's very dynamic)
          setTimeout(injectTwitterButton, 1000);
        },
        { once: true }
      );
    } else {
      setTimeout(injectTwitterButton, 1000);
    }

    // Set up a debounced mutation observer to re-inject if Twitter removes it
    // Twitter is very dynamic and might remove injected elements during navigation
    let reinjectionTimeout: ReturnType<typeof setTimeout> | null = null;
    const observer = new MutationObserver(() => {
      // Debounce to avoid multiple re-injections during rapid DOM changes
      if (reinjectionTimeout) {
        clearTimeout(reinjectionTimeout);
      }

      reinjectionTimeout = setTimeout(() => {
        if (!document.getElementById("twitter-link-products-btn")) {
          console.log("[Twitter] Button removed, re-injecting...");
          injectTwitterButton();
        }
      }, 2000); // Wait 2 seconds of inactivity before checking
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: false, // Only watch direct children, not deep subtree
      });
    }
  } else {
    // For Medium, use React panel as before
    if (document.getElementById("affilink-panel-root")) return;

    const container = document.createElement("div");
    container.id = "affilink-panel-root";
    document.documentElement.appendChild(container);

    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

// Wait for page to settle a bit
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
} else {
  mountPanel();
}
