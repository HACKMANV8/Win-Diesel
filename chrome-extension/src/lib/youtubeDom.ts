export function findYouTubeFileInput(): HTMLInputElement | null {
  // YouTube Studio uses various file input selectors
  const selectors = [
    'input[type="file"]',
    'input[accept*="video"]',
    'input[accept*="mp4"]',
    'input[accept*="mov"]',
    'input[accept*="avi"]',
  ];

  for (const selector of selectors) {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
    for (const input of inputs) {
      // Check if it's in the upload area
      if (input.closest('[data-testid*="upload"]') || 
          input.closest('[class*="upload"]') ||
          (input.accept && input.accept.includes('video'))) {
        return input;
      }
    }
  }

  // Fallback: any file input on YouTube Studio
  const allFileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  return allFileInputs.length > 0 ? allFileInputs[0] : null;
}

export function isYouTubeStudioPage(): boolean {
  const hostname = location.hostname.toLowerCase();
  return hostname === 'studio.youtube.com' || 
         hostname === 'youtube.com' || 
         hostname.includes('studio.youtube') ||
         (hostname.includes('youtube.com') && location.pathname.includes('/edit'));
}

export function isYouTubeUploadPage(): boolean {
  if (!isYouTubeStudioPage()) return false;
  
  // YouTube Studio pages include upload, edit, and video management pages
  const isStudioPath = location.pathname.includes('/upload') || 
                       location.pathname.includes('/videos/upload') ||
                       location.pathname.includes('/edit') ||
                       location.pathname.includes('/watch') ||
                       location.pathname.startsWith('/channel') ||
                       location.search.includes('video');
  
  // Check if we're in YouTube Studio by looking for common elements
  const hasStudioElements = document.querySelector('[aria-label*="YouTube Studio"]') !== null ||
                             document.querySelector('ytd-app') !== null ||
                             document.querySelector('ytcp-uploads-dialog') !== null ||
                             document.querySelector('[class*="studio"]') !== null;
  
  return isStudioPath || hasStudioElements || location.hostname === 'studio.youtube.com';
}
