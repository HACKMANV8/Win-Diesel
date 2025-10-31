import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractProducts, getSettings, resolveAsins } from '@lib/api';
import { getArticleText } from '@lib/mediumDom';
import { applyLinks, undoLinks } from '@lib/linker';

type Item = { name: string; asin?: string; title?: string; url?: string };

export default function App() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<{ affiliateTag: string; linkPolicy: 'first' | 'all' } | null>(null);

  useEffect(() => {
    getSettings().then((s) => setSettings({ affiliateTag: s.affiliateTag, linkPolicy: s.linkPolicy }));
  }, []);

  const scan = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const text = getArticleText();
      const candidates = await extractProducts(text);
      const resolved = await resolveAsins(candidates);
      setItems(resolved);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to scan');
    } finally {
      setBusy(false);
    }
  }, []);

  const applyAll = useCallback(async () => {
    if (!settings) return;
    const linkables = items.filter((i) => i.url).map((i) => ({ name: i.name, url: i.url! }));
    applyLinks(linkables, settings.linkPolicy);
  }, [items, settings]);

  const hasItems = items.length > 0;

  const body = useMemo(() => (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Affiliate Linker</div>
        {settings && (
          <span className="affilink-badge">{settings.linkPolicy === 'first' ? 'First occurrence' : 'All occurrences'}</span>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="flex gap-2">
        <button className="affilink-btn" onClick={scan} disabled={busy}>
          {busy ? 'Scanning…' : 'Scan products'}
        </button>
        <button className="affilink-btn" onClick={applyAll} disabled={!hasItems}>
          Apply links
        </button>
        <button className="affilink-btn" onClick={() => undoLinks()}>
          Undo
        </button>
      </div>

      <div className="max-h-64 overflow-auto border rounded">
        {items.length === 0 ? (
          <div className="text-xs text-gray-500 p-3">No products yet. Click Scan.</div>
        ) : (
          <ul className="divide-y">
            {items.map((it, idx) => (
              <li key={idx} className="text-sm p-2">
                <div className="font-medium truncate" title={it.title || it.name}>{it.title || it.name}</div>
                <div className="text-xs text-gray-500 truncate" title={it.url}>{it.url || '—'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ), [busy, error, items, scan, applyAll, hasItems, settings]);

  return (
    <div className="affilink-panel">
      {body}
    </div>
  );
}


