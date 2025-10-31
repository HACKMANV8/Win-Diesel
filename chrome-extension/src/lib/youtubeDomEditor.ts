/**
 * YouTube Studio DOM manipulation helpers for description field
 */

export type ProductLink = {
  product_name: string;
  custom_link: string;
};

/**
 * Find the YouTube description textarea/contenteditable field
 */
export function findYouTubeDescriptionField(): HTMLTextAreaElement | HTMLElement | null {
  console.log('[YouTube DOM] Searching for description field...');
  
  // Strategy 1: Look for textareas with "description" in aria-label (case insensitive)
  const textareas = document.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
  console.log(`[YouTube DOM] Found ${textareas.length} textareas total`);
  
  for (const ta of textareas) {
    const ariaLabel = (ta.getAttribute('aria-label') || '').toLowerCase();
    const placeholder = (ta.placeholder || '').toLowerCase();
    const id = (ta.id || '').toLowerCase();
    
    console.log(`[YouTube DOM] Checking textarea:`, { ariaLabel, placeholder, id, name: ta.name });
    
    if (ariaLabel.includes('description') || 
        ariaLabel.includes('tell viewers') ||
        placeholder.includes('description') ||
        id.includes('description')) {
      console.log('[YouTube DOM] ✓ Found description textarea!');
      return ta;
    }
  }

  // Strategy 2: Look for specific YouTube Studio selectors
  const selectors = [
    'textarea#description-textarea',
    'textarea#description',
    'textarea[name="description"]',
    'ytcp-video-metadata-editor textarea',
    'ytcp-social-suggestions-textbox textarea',
    '#description-container textarea',
    '[id*="description"] textarea',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLTextAreaElement | null;
    if (element) {
      console.log(`[YouTube DOM] ✓ Found via selector: ${selector}`);
      return element;
    }
  }

  // Strategy 3: Look for the second largest textarea (title is usually largest, description is second)
  const sortedTextareas = Array.from(textareas).sort((a, b) => {
    const areaA = a.offsetHeight * a.offsetWidth;
    const areaB = b.offsetHeight * b.offsetWidth;
    return areaB - areaA;
  }).filter(ta => ta.offsetHeight > 0 && ta.offsetWidth > 0); // Only visible ones

  console.log(`[YouTube DOM] Sorted textareas by size:`, sortedTextareas.map((ta, i) => ({
    index: i,
    area: ta.offsetHeight * ta.offsetWidth,
    ariaLabel: ta.getAttribute('aria-label'),
    placeholder: ta.placeholder,
  })));

  if (sortedTextareas.length >= 2) {
    console.log('[YouTube DOM] ✓ Using second largest textarea as description');
    return sortedTextareas[1];
  }

  // Strategy 4: contenteditable div
  const contentEditables = document.querySelectorAll('[contenteditable="true"]') as NodeListOf<HTMLElement>;
  for (const ce of contentEditables) {
    const ariaLabel = (ce.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('description') || ariaLabel.includes('tell')) {
      console.log('[YouTube DOM] ✓ Found description contenteditable');
      return ce;
    }
  }

  console.error('[YouTube DOM] ✗ Could not find description field with any strategy');
  return null;
}

/**
 * Get current description content
 */
export function getYouTubeDescription(): string {
  const field = findYouTubeDescriptionField();
  if (!field) return '';

  if (field instanceof HTMLTextAreaElement) {
    return field.value;
  } else {
    // contenteditable
    return field.textContent || '';
  }
}

/**
 * Set YouTube description content
 */
export function setYouTubeDescription(content: string): boolean {
  const field = findYouTubeDescriptionField();
  if (!field) return false;

  if (field instanceof HTMLTextAreaElement) {
    field.value = content;
    // Trigger events for YouTube's framework
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  } else {
    // contenteditable
    field.textContent = content;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
}

/**
 * Append text to YouTube description
 */
export function appendToYouTubeDescription(text: string): boolean {
  const current = getYouTubeDescription();
  const needsGap = current.length > 0 && !current.endsWith('\n');
  const newContent = `${current}${needsGap ? '\n\n' : ''}${text}`;
  return setYouTubeDescription(newContent);
}

/**
 * Insert product links into YouTube description
 * YouTube description supports plain text with URLs
 */
export function insertProductLinksIntoDescription(products: ProductLink[]): boolean {
  if (products.length === 0) return false;

  const currentDescription = getYouTubeDescription();
  
  // Build product links section
  const linksSection = [
    '🔗 Products mentioned:',
    ...products.map(p => `• ${p.product_name}: ${p.custom_link}`),
    ''
  ].join('\n');

  // Check if we already have a products section
  if (currentDescription.toLowerCase().includes('products mentioned')) {
    console.log('[YouTube DOM] Products section already exists, replacing...');
    // Replace existing section
    const lines = currentDescription.split('\n');
    const startIdx = lines.findIndex(line => line.toLowerCase().includes('products mentioned'));
    if (startIdx >= 0) {
      // Find the end of the section (next empty line or section)
      let endIdx = startIdx + 1;
      while (endIdx < lines.length && lines[endIdx].trim().startsWith('•')) {
        endIdx++;
      }
      // Remove old section and insert new one
      lines.splice(startIdx, endIdx - startIdx, linksSection);
      return setYouTubeDescription(lines.join('\n'));
    }
  }

  // Append new section
  console.log('[YouTube DOM] Appending products section');
  return appendToYouTubeDescription(linksSection);
}

/**
 * Replace product names with links in description (for plain text format)
 * This creates a "Products mentioned" section at the end
 */
export function replaceProductsInYouTubeDescription(products: ProductLink[]): boolean {
  if (products.length === 0) return false;

  console.log(`[YouTube DOM] Inserting ${products.length} product links into description`);
  return insertProductLinksIntoDescription(products);
}

