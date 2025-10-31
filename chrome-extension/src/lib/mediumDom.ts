export function findMediumEditorRoots(): HTMLElement[] {
  const editors: HTMLElement[] = [];
  // Medium editor often uses contenteditable regions; include visible ones
  const nodes = document.querySelectorAll<HTMLElement>('[contenteditable="true"], div[role="textbox"]');
  nodes.forEach((n) => {
    const style = window.getComputedStyle(n);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      editors.push(n);
    }
  });
  return editors;
}

export function getArticleText(): string {
  const roots = findMediumEditorRoots();
  const pieces: string[] = [];
  const isSkippable = (el: Node) => {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    return tag === 'A' || tag === 'CODE' || tag === 'PRE' || tag === 'IFRAME' || tag === 'IMG' || tag === 'BUTTON';
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      if (!roots.some((r) => r.contains(node))) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (isSkippable(parent)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent || '';
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  } as any);

  let current: Node | null = walker.nextNode();
  while (current) {
    pieces.push(current.textContent || '');
    current = walker.nextNode();
  }
  return pieces.join('\n');
}

export type TextOccurrence = { node: Text; start: number; end: number };

export function findFirstOccurrenceInEditor(term: string): TextOccurrence | null {
  if (!term) return null;
  const roots = findMediumEditorRoots();
  const lower = term.toLowerCase();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      if (!roots.some((r) => r.contains(node))) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['A', 'CODE', 'PRE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent || '';
      if (!text.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  } as any);

  let current: Node | null = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const idx = (textNode.textContent || '').toLowerCase().indexOf(lower);
    if (idx >= 0) {
      return { node: textNode, start: idx, end: idx + term.length };
    }
    current = walker.nextNode();
  }
  return null;
}


