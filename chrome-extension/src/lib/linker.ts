import { findFirstOccurrenceInEditor } from './mediumDom';

export type LinkItem = { name: string; url: string };

const LINK_ATTR = 'data-affilink';

export function applyLinks(items: LinkItem[], policy: 'first' | 'all' = 'first') {
  const created: HTMLAnchorElement[] = [];

  const linkOnce = (term: string, url: string) => {
    const occ = findFirstOccurrenceInEditor(term);
    if (!occ) return;
    const range = document.createRange();
    range.setStart(occ.node, occ.start);
    range.setEnd(occ.node, occ.end);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute(LINK_ATTR, '1');
    anchor.target = '_blank';
    anchor.rel = 'nofollow noopener sponsored';
    anchor.title = `${term}`;
    range.surroundContents(anchor);
    created.push(anchor);
  };

  items.forEach((it) => {
    if (policy === 'first') {
      linkOnce(it.name, it.url);
    } else {
      // naive multi-link: repeatedly search until not found
      // guard against infinite loops by tracking last anchor count
      let prevCount = -1;
      let loops = 0;
      while (loops < 50) {
        const before = document.querySelectorAll(`a[${LINK_ATTR}]`).length;
        linkOnce(it.name, it.url);
        const after = document.querySelectorAll(`a[${LINK_ATTR}]`).length;
        if (after === before || after === prevCount) break;
        prevCount = after;
        loops += 1;
      }
    }
  });

  return created;
}

export function undoLinks() {
  const anchors = Array.from(document.querySelectorAll(`a[${LINK_ATTR}]`)) as HTMLAnchorElement[];
  anchors.forEach((a) => {
    const parent = a.parentNode;
    while (a.firstChild) parent?.insertBefore(a.firstChild, a);
    parent?.removeChild(a);
  });
}


