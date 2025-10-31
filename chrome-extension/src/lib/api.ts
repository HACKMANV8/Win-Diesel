import axios from 'axios';

export type ProductCandidate = { name: string };
export type ResolvedProduct = { name: string; asin: string; title: string; url: string };

export async function getSettings() {
  return new Promise<{ backendBaseUrl: string; affiliateTag: string; linkPolicy: 'first' | 'all'; doNotLink: string[] }>((resolve) => {
    chrome.storage.sync.get({
      backendBaseUrl: '',
      affiliateTag: 'shivanshkaran-21',
      linkPolicy: 'first',
      doNotLink: [] as string[]
    }, (items) => resolve(items as any));
  });
}

export async function extractProducts(text: string): Promise<ProductCandidate[]> {
  const { backendBaseUrl } = await getSettings();
  if (!backendBaseUrl) throw new Error('Backend base URL is not configured');
  // Expected backend contract (MVP): POST /extract-products { text } => { products: string[] }
  const res = await axios.post(`${backendBaseUrl.replace(/\/$/, '')}/extract-products`, { text });
  const products: string[] = res.data?.products ?? [];
  return products.map((p) => ({ name: p }));
}

export async function resolveAsins(candidates: ProductCandidate[]): Promise<ResolvedProduct[]> {
  const { backendBaseUrl, affiliateTag } = await getSettings();
  if (!backendBaseUrl) throw new Error('Backend base URL is not configured');
  // Expected backend contract (MVP): POST /resolve-asins { candidates: string[], tag } => { items: [{ name, asin, title, url }] }
  const res = await axios.post(`${backendBaseUrl.replace(/\/$/, '')}/resolve-asins`, {
    candidates: candidates.map((c) => c.name),
    tag: affiliateTag
  });
  const items = (res.data?.items ?? []) as ResolvedProduct[];
  return items;
}


