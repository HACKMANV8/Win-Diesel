import { useEffect, useState } from 'react';

type LinkPolicy = 'first' | 'all';

export default function OptionsApp() {
  const [backendBaseUrl, setBackendBaseUrl] = useState('');
  const [affiliateTag, setAffiliateTag] = useState('shivanshkaran-21');
  const [linkPolicy, setLinkPolicy] = useState<LinkPolicy>('first');
  const [doNotLink, setDoNotLink] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get({
      backendBaseUrl: '',
      affiliateTag: 'shivanshkaran-21',
      linkPolicy: 'first',
      doNotLink: [] as string[]
    }, (items) => {
      setBackendBaseUrl(items.backendBaseUrl || '');
      setAffiliateTag(items.affiliateTag || 'shivanshkaran-21');
      setLinkPolicy(items.linkPolicy as LinkPolicy);
      setDoNotLink((items.doNotLink || []).join('\n'));
    });
  }, []);

  const onSave = () => {
    const list = doNotLink.split('\n').map((s) => s.trim()).filter(Boolean);
    chrome.storage.sync.set({ backendBaseUrl, affiliateTag, linkPolicy, doNotLink: list }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-xl font-semibold">Affiliate Linker Settings</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium">Backend Base URL</label>
          <input className="border rounded p-2 w-full" placeholder="https://your-backend.example.com" value={backendBaseUrl} onChange={(e) => setBackendBaseUrl(e.target.value)} />
          <p className="text-xs text-gray-500">The server that exposes /extract-products and /resolve-asins</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Affiliate Tag</label>
            <input className="border rounded p-2 w-full" value={affiliateTag} onChange={(e) => setAffiliateTag(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Link Policy</label>
            <select className="border rounded p-2 w-full" value={linkPolicy} onChange={(e) => setLinkPolicy(e.target.value as LinkPolicy)}>
              <option value="first">First occurrence</option>
              <option value="all">All occurrences</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Do-not-link phrases (one per line)</label>
          <textarea className="border rounded p-2 w-full h-32" value={doNotLink} onChange={(e) => setDoNotLink(e.target.value)} />
        </div>

        <div className="flex items-center gap-2">
          <button className="affilink-btn" onClick={onSave}>Save</button>
          {saved && <span className="text-sm text-green-700">Saved</span>}
        </div>
      </div>
    </div>
  );
}


