export function findDevtoMarkdownTextarea(): HTMLTextAreaElement | null {
  // Primary editor in dev.to is a markdown textarea named body_markdown
  const ta = document.querySelector(
    'textarea[name="body_markdown"]'
  ) as HTMLTextAreaElement | null;
  if (ta) return ta;

  // Fallbacks observed in some layouts/tests
  const byId = document.getElementById(
    "article-body"
  ) as HTMLTextAreaElement | null;
  if (byId && byId.tagName === "TEXTAREA") return byId;

  // Last-resort: any visible textarea within main article form
  const candidates = Array.from(
    document.querySelectorAll("form textarea")
  ) as HTMLTextAreaElement[];
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if (style.display !== "none" && style.visibility !== "hidden") return el;
  }
  return null;
}

export function getDevtoEditorContent(): string {
  const textarea = findDevtoMarkdownTextarea();
  if (textarea) {
    return textarea.value;
  }
  return "";
}

export function appendToDevtoEditor(text: string): boolean {
  const textarea = findDevtoMarkdownTextarea();
  if (textarea) {
    const needsGap =
      textarea.value.length > 0 && !textarea.value.endsWith("\n");
    const insertion = `${needsGap ? "\n\n" : ""}${text}`;
    textarea.value += insertion;
    // Notify frameworks/listeners dev.to uses
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // Contenteditable fallback: find a visible editable region and append a paragraph
  const editable = document.querySelector(
    '[contenteditable="true"], div[role="textbox"]'
  ) as HTMLElement | null;
  if (editable) {
    const p = document.createElement("p");
    p.textContent = text;
    editable.appendChild(p);
    return true;
  }

  return false;
}

export function replaceInDevtoEditor(
  searchText: string,
  replaceWith: string
): boolean {
  const textarea = findDevtoMarkdownTextarea();
  const normalizedSearch = searchText.toLowerCase();
  if (textarea) {
    const valueLower = textarea.value.toLowerCase();
    // Try to replace bolded first (**searchText**)
    const boldNeedle = `**${normalizedSearch}**`;
    let start = valueLower.indexOf(boldNeedle);
    let end = -1;
    if (start >= 0) {
      end = start + boldNeedle.length;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      textarea.value = `${before}${replaceWith}${after}`;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    // Fallback: plain search
    start = valueLower.indexOf(normalizedSearch);
    if (start >= 0) {
      end = start + normalizedSearch.length;
      const before = textarea.value.slice(0, start);
      const after = textarea.value.slice(end);
      textarea.value = `${before}${replaceWith}${after}`;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    // Not found → append to signal success
    const needsGap =
      textarea.value.length > 0 && !textarea.value.endsWith("\n");
    const insertion = `${needsGap ? "\n\n" : ""}${replaceWith}`;
    textarea.value += insertion;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  const editable = document.querySelector(
    '[contenteditable="true"], div[role="textbox"]'
  ) as HTMLElement | null;
  if (editable) {
    // Simple text replacement in the first matching text node
    const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
    let current: Node | null = walker.nextNode();
    const lower = normalizedSearch;
    while (current) {
      const tn = current as Text;
      const idx = (tn.textContent || "").toLowerCase().indexOf(lower);
      if (idx >= 0) {
        const txt = tn.textContent || "";
        tn.textContent =
          txt.slice(0, idx) + replaceWith + txt.slice(idx + searchText.length);
        return true;
      }
      current = walker.nextNode();
    }
    const p = document.createElement("p");
    p.textContent = replaceWith;
    editable.appendChild(p);
    return true;
  }

  return false;
}

export type ProductLink = {
  product_name: string;
  custom_link: string;
};

function isInsideMarkdownLink(
  content: string,
  start: number,
  end: number
): boolean {
  // Check backwards for opening bracket
  let pos = start - 1;
  while (pos >= 0 && content[pos] !== "[" && content[pos] !== "]") {
    pos--;
  }
  if (pos >= 0 && content[pos] === "[") {
    // Found opening bracket, check if there's a closing bracket followed by (
    let checkPos = pos + 1;
    while (checkPos < end && content[checkPos] !== "]") {
      checkPos++;
    }
    if (checkPos < content.length && content[checkPos] === "]") {
      // Check if followed by (
      if (checkPos + 1 < content.length && content[checkPos + 1] === "(") {
        return true;
      }
    }
  }
  return false;
}

export function replaceProductsWithLinks(products: ProductLink[]): boolean {
  const textarea = findDevtoMarkdownTextarea();
  if (!textarea) return false;

  let content = textarea.value;
  let totalReplaced = 0;

  for (const product of products) {
    const productName = product.product_name;
    const link = product.custom_link;
    const escapedName = escapeRegex(productName);

    // Step 1: Replace bold occurrences: **Product Name**
    const boldPattern = new RegExp(`\\*\\*${escapedName}\\*\\*`, "gi");
    content = content.replace(boldPattern, (match) => {
      const preservedCase = match.replace(/\*\*/g, "");
      totalReplaced++;
      return `[${preservedCase}](${link})`;
    });

    // Step 2: Replace plain occurrences (not already in links)
    const plainPattern = new RegExp(escapedName, "gi");
    const matches: Array<{ start: number; end: number; text: string }> = [];

    // Find all matches
    plainPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = plainPattern.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // Skip if already inside a markdown link
      if (isInsideMarkdownLink(content, start, end)) {
        continue;
      }

      matches.push({ start, end, text: match[0] });
    }

    // Replace from end to start to preserve positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const before = content.slice(0, m.start);
      const after = content.slice(m.end);
      content = `${before}[${m.text}](${link})${after}`;
      totalReplaced++;
    }
  }

  if (totalReplaced > 0) {
    textarea.value = content;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
