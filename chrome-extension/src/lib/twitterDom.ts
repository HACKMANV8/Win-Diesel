export type ProductLink = {
  product_name: string;
  custom_link: string;
};

export function findTwitterEditor(): HTMLElement | null {
  // Twitter/X uses contenteditable divs for the post editor
  // Common selectors observed:
  // - div[data-testid="tweetTextarea_0"] or similar testid variants
  // - div[role="textbox"] within the composer
  // - div[contenteditable="true"] with specific classes
  
  // Try multiple data-testid patterns
  const testIdSelectors = [
    'div[data-testid="tweetTextarea_0"]',
    'div[data-testid*="tweetTextarea"]',
    'div[data-testid*="textInput"]',
    'div[data-testid*="editableInput"]'
  ];
  
  for (const selector of testIdSelectors) {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el && (el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true')) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return el;
      }
    }
  }

  // Try role="textbox" in the composer area
  const textboxes = Array.from(document.querySelectorAll('div[role="textbox"]')) as HTMLElement[];
  for (const textbox of textboxes) {
    if (textbox.contentEditable === 'true' || textbox.getAttribute('contenteditable') === 'true') {
      const style = window.getComputedStyle(textbox);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        // Check if it's likely the post composer (has placeholder or in composer container)
        const placeholder = textbox.getAttribute('data-placeholder')?.toLowerCase() || '';
        const parent = textbox.closest('[data-testid*="toolBar"], [data-testid*="compose"], [data-testid*="tweetTextarea"]');
        if (placeholder.includes('happening') || placeholder.includes('tweet') || placeholder.includes('post') || parent) {
          return textbox;
        }
      }
    }
  }

  // Fallback: find any visible contenteditable that looks like a post editor
  const candidates = Array.from(
    document.querySelectorAll('div[contenteditable="true"], div[contenteditable="plaintext-only"]')
  ) as HTMLElement[];
  
  for (const el of candidates) {
    const style = window.getComputedStyle(el);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      // Check if it's in a composer-like container
      const placeholder = el.getAttribute('data-placeholder')?.toLowerCase() || '';
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      const parent = el.closest('[data-testid*="toolBar"], [data-testid*="compose"], [data-testid*="tweetTextarea"]');
      
      if (placeholder.includes('happening') || placeholder.includes('tweet') || placeholder.includes('post') ||
          ariaLabel.includes('tweet') || ariaLabel.includes('post') || parent) {
        return el;
      }
    }
  }

  return null;
}

export function getTwitterEditorContent(): string {
  const editor = findTwitterEditor();
  if (editor) {
    return editor.innerText || editor.textContent || '';
  }
  return '';
}

// Track if we're currently inserting to prevent race conditions
let isInserting = false;
let insertionCount = 0;

export function appendLinksToTwitterPost(products: ProductLink[]): boolean {
  insertionCount++;
  const callNumber = insertionCount;
  
  console.log(`[Twitter] ========== CALL #${callNumber} START ==========`);
  console.log(`[Twitter] appendLinksToTwitterPost called with ${products.length} products`);
  console.log('[Twitter] Stack trace:', new Error().stack);
  
  // Check if already inserting
  if (isInserting) {
    console.warn(`[Twitter] CALL #${callNumber}: Already inserting, blocking this call`);
    return false;
  }
  
  const editor = findTwitterEditor();
  if (!editor) {
    console.error(`[Twitter] CALL #${callNumber}: Editor not found`);
    return false;
  }

  // Get current text and clean it up
  let currentText = editor.innerText || editor.textContent || '';
  console.log(`[Twitter] CALL #${callNumber}: Current text length:`, currentText.length);
  console.log(`[Twitter] CALL #${callNumber}: Current text:`, currentText);
  
  // Check if links were already added (detect duplicates)
  const linksAlreadyPresent = products.some(p => 
    currentText.includes(p.custom_link)
  );
  
  if (linksAlreadyPresent) {
    console.log(`[Twitter] CALL #${callNumber}: Links already present in post, skipping append`);
    return true;
  }
  
  // Set the lock
  isInserting = true;
  console.log(`[Twitter] CALL #${callNumber}: Lock acquired, proceeding with insertion`);

  // Format links nicely with bullet points
  // Format: 🔗 Product Name: https://custom.link
  const linksText = products
    .map(p => `🔗 ${p.product_name}: ${p.custom_link}`)
    .join('\n');

  console.log(`[Twitter] CALL #${callNumber}: Text to append:`, linksText);

  // Determine spacing
  const needsSpacing = currentText.length > 0 && !currentText.endsWith('\n');
  const spacing = needsSpacing ? '\n\n' : '';
  const textToAppend = spacing + linksText;
  
  console.log(`[Twitter] CALL #${callNumber}: Final text with spacing:`, textToAppend);

  try {
    // Use DataTransfer with paste event - Twitter handles this properly
    console.log(`[Twitter] CALL #${callNumber}: Using DataTransfer paste event`);
    
    const lengthBefore = editor.innerText.length;
    console.log(`[Twitter] CALL #${callNumber}: Editor length before:`, lengthBefore);
    
    // Focus the editor
    editor.focus();
    
    // Move cursor to end
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false); // Collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
      console.log(`[Twitter] CALL #${callNumber}: Cursor positioned at end`);
    }
    
    // Create a paste event with DataTransfer
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', textToAppend);
    
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
      composed: true
    });
    
    console.log(`[Twitter] CALL #${callNumber}: Dispatching paste event...`);
    const eventDispatched = editor.dispatchEvent(pasteEvent);
    console.log(`[Twitter] CALL #${callNumber}: Paste event dispatched:`, eventDispatched);
    
    // Verify insertion after a delay
    setTimeout(() => {
      const lengthAfter = editor.innerText.length;
      const finalText = editor.innerText;
      console.log(`[Twitter] CALL #${callNumber}: VERIFICATION - Editor length after:`, lengthAfter);
      console.log(`[Twitter] CALL #${callNumber}: VERIFICATION - Editor text after:`, finalText);
      
      // Check if text was inserted
      if (lengthAfter > lengthBefore) {
        console.log(`[Twitter] CALL #${callNumber}: Text inserted successfully via paste event`);
        
        // Check for URL duplication
        const expectedLength = lengthBefore + textToAppend.length;
        if (lengthAfter > expectedLength + 50) {
          console.warn(`[Twitter] CALL #${callNumber}: Text length unexpectedly large, checking for duplicates`);
          
          const urlPattern = /https:\/\/[^\s]+/g;
          const urls = finalText.match(urlPattern) || [];
          console.log(`[Twitter] CALL #${callNumber}: Found ${urls.length} URLs in final text`);
          
          const urlCounts = new Map<string, number>();
          urls.forEach(url => urlCounts.set(url, (urlCounts.get(url) || 0) + 1));
          
          const hasDuplicates = Array.from(urlCounts.values()).some(count => count > 1);
          if (hasDuplicates) {
            console.warn(`[Twitter] CALL #${callNumber}: Detected duplicates, cleaning up`);
            cleanupDuplicateLinks(editor, products, callNumber);
          }
        }
      } else {
        console.warn(`[Twitter] CALL #${callNumber}: Paste event didn't insert text, trying character-by-character input`);
        insertTextCharByChar(editor, textToAppend, callNumber);
      }
      
      // Release lock
      isInserting = false;
      console.log(`[Twitter] CALL #${callNumber}: Lock released`);
      console.log(`[Twitter] ========== CALL #${callNumber} END ==========`);
    }, 400);
    
    return true;
  } catch (error) {
    console.error(`[Twitter] CALL #${callNumber}: Failed to append text:`, error);
    isInserting = false;
    return false;
  }
}

/**
 * Insert text character by character with InputEvents - most compatible with React
 */
function insertTextCharByChar(editor: HTMLElement, text: string, callNumber: number): void {
  console.log(`[Twitter] CALL #${callNumber}: CHAR-BY-CHAR - Starting character-by-character insertion`);
  
  let index = 0;
  const interval = setInterval(() => {
    if (index >= text.length) {
      clearInterval(interval);
      console.log(`[Twitter] CALL #${callNumber}: CHAR-BY-CHAR - Completed`);
      return;
    }
    
    const char = text[index];
    
    // Create and dispatch beforeinput event
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: char,
      bubbles: true,
      cancelable: true
    });
    
    const notCancelled = editor.dispatchEvent(beforeInputEvent);
    
    if (notCancelled) {
      // Insert the character using execCommand
      document.execCommand('insertText', false, char);
      
      // Dispatch input event
      const inputEvent = new InputEvent('input', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: false
      });
      editor.dispatchEvent(inputEvent);
    }
    
    index++;
  }, 10); // 10ms delay between characters
}

/**
 * Fallback method to insert text when execCommand fails
 * WARNING: This breaks Twitter's React state - use only as last resort
 */
function fallbackInsertText(editor: HTMLElement, text: string, callNumber: number): boolean {
  console.log(`[Twitter] CALL #${callNumber}: FALLBACK - Attempting fallback insertion (may break React)`);
  try {
    const currentText = editor.innerText || '';
    const newText = currentText + text;
    
    console.log(`[Twitter] CALL #${callNumber}: FALLBACK - Current length: ${currentText.length}, new length: ${newText.length}`);
    
    // Set the text content
    editor.innerText = newText;
    
    // Dispatch input event to trigger Twitter's listeners
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Move cursor to end
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    console.log(`[Twitter] CALL #${callNumber}: FALLBACK - Insertion successful`);
    return true;
  } catch (error) {
    console.error(`[Twitter] CALL #${callNumber}: FALLBACK - Insertion failed:`, error);
    return false;
  }
}

/**
 * Remove duplicate links from the editor
 * Handles both line-separated duplicates and concatenated URLs
 */
function cleanupDuplicateLinks(editor: HTMLElement, products: ProductLink[], callNumber: number): void {
  console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Starting duplicate cleanup`);
  try {
    let text = editor.innerText || '';
    console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Text length before cleanup: ${text.length}`);
    console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Text before:`, text);
    
    // For each product link, ensure it appears only once
    products.forEach(product => {
      const url = product.custom_link;
      
      // Count how many times this URL appears
      const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = text.match(urlRegex);
      
      if (!matches || matches.length === 0) {
        console.log(`[Twitter] CALL #${callNumber}: CLEANUP - URL not found: ${url}`);
        return;
      }
      
      console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Found ${matches.length} occurrences of ${url}`);
      
      if (matches.length === 1) {
        console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Only one occurrence, no cleanup needed`);
        return;
      }
      
      // Find the first occurrence and keep it
      const firstIndex = text.indexOf(url);
      console.log(`[Twitter] CALL #${callNumber}: CLEANUP - First occurrence at index ${firstIndex}`);
      
      // Check if URLs are concatenated (no space/newline between them)
      const checkConcatenated = text.slice(firstIndex, firstIndex + url.length * 3);
      if (checkConcatenated === url.repeat(3) || checkConcatenated.startsWith(url + url)) {
        console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Detected concatenated URLs, removing duplicates`);
        // Remove the concatenated duplicates (keep only the first one)
        text = text.slice(0, firstIndex + url.length) + text.slice(firstIndex + url.length * matches.length);
      } else {
        // URLs are on separate lines, remove duplicate lines
        console.log(`[Twitter] CALL #${callNumber}: CLEANUP - URLs are line-separated, removing duplicate lines`);
        let duplicatesRemoved = 0;
        let searchFrom = firstIndex + url.length;
        
        while (true) {
          const nextIndex = text.indexOf(url, searchFrom);
          if (nextIndex === -1) break;
          
          console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Found duplicate at index ${nextIndex}`);
          duplicatesRemoved++;
          
          // Remove the duplicate line
          const lineStart = text.lastIndexOf('\n', nextIndex);
          const lineEnd = text.indexOf('\n', nextIndex);
          
          if (lineStart !== -1 && lineEnd !== -1) {
            text = text.slice(0, lineStart) + text.slice(lineEnd);
          } else if (lineStart !== -1) {
            text = text.slice(0, lineStart);
          } else if (lineEnd !== -1) {
            text = text.slice(lineEnd + 1);
          }
          
          // Continue searching from the same position
          searchFrom = lineStart !== -1 ? lineStart : 0;
        }
        
        console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Removed ${duplicatesRemoved} duplicate lines`);
      }
    });
    
    // Update editor with cleaned text
    editor.innerText = text;
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    
    console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Text length after cleanup: ${text.length}`);
    console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Text after:`, text);
    console.log(`[Twitter] CALL #${callNumber}: CLEANUP - Cleanup complete`);
  } catch (error) {
    console.error(`[Twitter] CALL #${callNumber}: CLEANUP - Failed to cleanup duplicates:`, error);
  }
}

