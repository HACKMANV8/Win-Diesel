import { useEffect, useState } from 'react';
import { transcribeVideo, TranscriptionStatus, TranscriptionResult } from '../lib/youtubeTranscription';
import { createLinksForDevto, type DevtoProductLink } from '../lib/api';
import { replaceProductsInYouTubeDescription, type ProductLink } from '../lib/youtubeDomEditor';

export default function YouTubeTranscriptionPanel() {
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [products, setProducts] = useState<ProductLink[]>([]);
  const [linkingStatus, setLinkingStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');

  useEffect(() => {
    console.log('[YouTube Transcription Panel] Component mounted, setting up file interceptor');
    
    const isValidVideoFile = (file: File): boolean => {
      // Check MIME type
      const validMimeTypes = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/x-matroska',
        'video/3gpp',
        'video/x-flv',
        'video/x-ms-wmv',
      ];
      
      // Check file extension
      const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp', '.ogv'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      // Check MIME type (more lenient - check if starts with any valid type)
      const hasValidMimeType = file.type && validMimeTypes.some(mime => file.type.toLowerCase().startsWith(mime));
      
      // Check file size (must be > 100KB to avoid metadata files and thumbnails)
      // Videos are typically much larger than 100KB
      const hasValidSize = file.size > 100 * 1024; // 100KB minimum
      
      console.log('[YouTube Transcription] File validation check:', {
        name: file.name,
        type: file.type,
        size: file.size,
        hasValidExtension,
        hasValidMimeType,
        hasValidSize,
        willPass: (hasValidMimeType || hasValidExtension) && hasValidSize
      });
      
      return (hasValidMimeType || hasValidExtension) && hasValidSize;
    };

    const findBestVideoFile = (files: FileList | null): File | null => {
      if (!files || files.length === 0) return null;
      
      console.log('[YouTube Transcription] Checking all files:', files.length);
      
      const videoFiles: File[] = [];
      
      // Check all files and collect video candidates
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[YouTube Transcription] File ${i}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
          sizeMB: Math.round(file.size / (1024 * 1024) * 100) / 100
        });
        
        // Must be large enough to be a real video (at least 100KB to filter out thumbnails)
        if (file.size < 100 * 1024) {
          console.log(`[YouTube Transcription] File ${i} too small, skipping`);
          continue;
        }
        
        // Check extension
        const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp'];
        const fileName = file.name.toLowerCase();
        const hasVideoExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        // Check MIME type
        const hasVideoMimeType = file.type && (
          file.type.startsWith('video/') ||
          file.type.includes('mp4') ||
          file.type.includes('quicktime')
        );
        
        // Accept if it has video extension OR video MIME type (and is large enough)
        if (hasVideoExtension || hasVideoMimeType) {
          videoFiles.push(file);
          console.log(`[YouTube Transcription] File ${i} is a video candidate`);
        }
      }
      
      if (videoFiles.length === 0) {
        console.log('[YouTube Transcription] No valid video files found');
        return null;
      }
      
      // Return the largest video file (most likely to be the actual video, not thumbnail)
      const largest = videoFiles.reduce((max, file) => file.size > max.size ? file : max);
      console.log('[YouTube Transcription] Selected largest video file:', {
        name: largest.name,
        size: largest.size,
        sizeMB: Math.round(largest.size / (1024 * 1024) * 100) / 100
      });
      
      return largest;
    };

    const handleFileUpload = async (event: Event) => {
      const input = event.target as HTMLInputElement;
      
      console.log('[YouTube Transcription] File input changed, total files:', input.files?.length || 0);
      
      // Find the best video file from all files (not just files[0])
      const file = findBestVideoFile(input.files);

      if (!file) {
        console.log('[YouTube Transcription] No valid video file found');
        return;
      }
      
      console.log('[YouTube Transcription] Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeMB: Math.round(file.size / (1024 * 1024) * 100) / 100,
        lastModified: new Date(file.lastModified).toISOString()
      });

      // Additional validation: file must be at least 100KB (to filter out thumbnails)
      if (file.size < 100 * 1024) {
        console.log('[YouTube Transcription] File too small (<100KB), likely not a video:', {
          name: file.name,
          type: file.type,
          size: file.size,
          sizeKB: Math.round(file.size / 1024 * 100) / 100
        });
        return;
      }
      
      // Final check: must have video extension or video MIME type
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp'];
      const hasVideoExtension = validExtensions.some(ext => fileName.endsWith(ext));
      const hasVideoMimeType = file.type && (
        file.type.startsWith('video/') ||
        file.type.includes('mp4') ||
        file.type.includes('quicktime')
      );
      
      if (!hasVideoExtension && !hasVideoMimeType) {
        console.warn('[YouTube Transcription] File lacks video extension and MIME type:', {
          name: file.name,
          type: file.type || 'unknown'
        });
        // Reject application/octet-stream without video extension
        if (file.type === 'application/octet-stream' || !file.type) {
          console.log('[YouTube Transcription] Rejecting application/octet-stream without video extension');
          return;
        }
      }

      console.log('[YouTube Transcription] Starting transcription for:', file.name);
      setFileName(file.name);
      setStatus('uploading');
      setError('');
      setTranscript('');

      // CRITICAL: Read file data IMMEDIATELY before YouTube processes it
      console.log('[YouTube Transcription] Reading file data immediately...');
      let fileData: ArrayBuffer;
      try {
        fileData = await file.arrayBuffer();
        console.log('[YouTube Transcription] File data captured, size:', fileData.byteLength, 'bytes');
      } catch (readError) {
        console.error('[YouTube Transcription] Failed to read file:', readError);
        setStatus('error');
        setError('Failed to read file data. Please try again.');
        return;
      }

      // Verify we actually got data
      if (!fileData || fileData.byteLength === 0) {
        console.error('[YouTube Transcription] File data is empty');
        setStatus('error');
        setError('File appears to be empty. Please try again.');
        return;
      }

      try {
        const result: TranscriptionResult = await transcribeVideo(fileData, file.name, (newStatus) => {
          console.log('[YouTube Transcription] Status update:', newStatus);
          setStatus(newStatus);
        });

        console.log('[YouTube Transcription] Transcription result:', result.status);
        setStatus(result.status);
        if (result.status === 'completed') {
          setTranscript(result.transcript);
          console.log('[YouTube Transcription] Transcript received, length:', result.transcript.length);
          
          // Step 2: Send transcript to backend to get product links
          console.log('[YouTube Transcription] Sending transcript to backend...');
          setLinkingStatus('creating');
          try {
            const response = await createLinksForDevto({
              transcript: result.transcript,
              customer_id: 'CUST006',
              customer_name: 'Anu',
            });

            console.log('[YouTube Transcription] Received products from backend:', response.products.length);
            
            // Convert to ProductLink format
            const productLinks: ProductLink[] = response.products.map((p) => ({
              product_name: p.product_name,
              custom_link: p.custom_link,
            }));
            
            setProducts(productLinks);

            // Step 3: Insert links into YouTube description
            if (productLinks.length > 0) {
              console.log('[YouTube Transcription] Inserting links into description...');
              const insertSuccess = replaceProductsInYouTubeDescription(productLinks);
              if (insertSuccess) {
                console.log('[YouTube Transcription] Successfully inserted product links');
                setLinkingStatus('success');
              } else {
                console.warn('[YouTube Transcription] Failed to find description field');
                setLinkingStatus('error');
                setError('Could not find YouTube description field. Please ensure you are on the video details page.');
              }
            } else {
              console.log('[YouTube Transcription] No products found in transcript');
              setLinkingStatus('idle');
            }
          } catch (linkError) {
            console.error('[YouTube Transcription] Failed to create links:', linkError);
            setLinkingStatus('error');
            setError(`Failed to create links: ${linkError instanceof Error ? linkError.message : 'Unknown error'}`);
          }
        } else if (result.status === 'error') {
          const errorMsg = result.error || 'Transcription failed';
          // Provide more helpful error messages
          if (errorMsg.includes('does not appear to contain audio') || errorMsg.includes('application/octet-stream')) {
            setError('Invalid file: This does not appear to be a valid video file. Please select a video file (e.g., .mp4, .mov, .avi).');
          } else {
            setError(errorMsg);
          }
          console.error('[YouTube Transcription] Error:', result.error);
        }
      } catch (err) {
        console.error('[YouTube Transcription] Unexpected error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unexpected error occurred');
      }
    };

    const setupFileInterceptor = () => {
      // Prioritize inputs that accept video files
      const allInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      const videoInputs = Array.from(allInputs).filter(input => {
        // Check if input accepts video or has video-related attributes
        const accept = (input.accept || '').toLowerCase();
        return accept.includes('video') || 
               accept.includes('mp4') || 
               accept.includes('mov') ||
               accept.includes('avi') ||
               input.closest('[class*="video"]') !== null ||
               input.closest('[class*="upload"]') !== null;
      });
      
      // Use video inputs first, then fall back to all inputs
      const inputsToUse = videoInputs.length > 0 ? videoInputs : Array.from(allInputs);
      
      // Only log if we find new inputs or on first run
      if (inputsToUse.length > 0 && inputsToUse.some(inp => !inp.dataset.transcriptListenerAdded)) {
        console.log('[YouTube Transcription] Found file inputs:', {
          total: allInputs.length,
          videoSpecific: videoInputs.length,
          willUse: inputsToUse.length
        });
      }
      
      inputsToUse.forEach((input, index) => {
        if (!input.dataset.transcriptListenerAdded) {
          console.log(`[YouTube Transcription] Adding listener to input ${index}`, {
            accept: input.accept,
            multiple: input.multiple,
            id: input.id,
            className: input.className,
            parent: input.parentElement?.tagName
          });
          input.addEventListener('change', handleFileUpload);
          input.dataset.transcriptListenerAdded = 'true';
        }
      });
    };

    // Initial setup
    setupFileInterceptor();

    // Throttle function to prevent excessive calls
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledSetup = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        setupFileInterceptor();
        throttleTimeout = null;
      }, 500); // Only run once every 500ms
    };

    // Watch for dynamically added file inputs (YouTube Studio loads content dynamically)
    // Use throttling to prevent spam from constant DOM updates
    const observer = new MutationObserver(throttledSetup);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      fileInputs.forEach((input) => {
        input.removeEventListener('change', handleFileUpload);
        delete input.dataset.transcriptListenerAdded;
      });
    };
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Waiting for video upload...';
      case 'uploading':
        return 'Uploading video...';
      case 'transcribing':
        return 'Transcribing video...';
      case 'completed':
        return 'Transcription complete';
      case 'error':
        return 'Error occurred';
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        maxHeight: '600px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#333' }}>
          🎬 Video Transcription
        </h3>
      </div>

      <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
        {fileName && (
          <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666' }}>
            <strong>File:</strong> {fileName}
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor:
                status === 'completed'
                  ? '#d4edda'
                  : status === 'error'
                  ? '#f8d7da'
                  : status === 'idle'
                  ? '#e7f3ff'
                  : '#fff3cd',
              border:
                status === 'completed'
                  ? '1px solid #c3e6cb'
                  : status === 'error'
                  ? '1px solid #f5c6cb'
                  : status === 'idle'
                  ? '1px solid #b3d7ff'
                  : '1px solid #ffeaa7',
              borderRadius: '4px',
              fontSize: '14px',
              color:
                status === 'completed'
                  ? '#155724'
                  : status === 'error'
                  ? '#721c24'
                  : status === 'idle'
                  ? '#004085'
                  : '#856404',
            }}
          >
            {status === 'uploading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Uploading...
              </div>
            )}
            {status === 'transcribing' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Transcribing...
              </div>
            )}
            {(status === 'idle' || status === 'completed' || status === 'error') && (
              <div>{getStatusText()}</div>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#721c24',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {transcript && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#333',
              }}
            >
              Transcript:
            </div>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#333',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {transcript}
            </div>
          </div>
        )}

        {/* Linking status */}
        {linkingStatus !== 'idle' && (
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                padding: '8px 12px',
                backgroundColor:
                  linkingStatus === 'success'
                    ? '#d4edda'
                    : linkingStatus === 'error'
                    ? '#f8d7da'
                    : '#fff3cd',
                border:
                  linkingStatus === 'success'
                    ? '1px solid #c3e6cb'
                    : linkingStatus === 'error'
                    ? '1px solid #f5c6cb'
                    : '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '13px',
                color:
                  linkingStatus === 'success'
                    ? '#155724'
                    : linkingStatus === 'error'
                    ? '#721c24'
                    : '#856404',
              }}
            >
              {linkingStatus === 'creating' && '🔗 Creating product links...'}
              {linkingStatus === 'success' && `✅ ${products.length} product link(s) added to description`}
              {linkingStatus === 'error' && '❌ Failed to add links'}
            </div>
          </div>
        )}

        {/* Products list */}
        {products.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                color: '#333',
              }}
            >
              Products found ({products.length}):
            </div>
            <div
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
            >
              {products.map((product, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    borderBottom: index < products.length - 1 ? '1px solid #e0e0e0' : 'none',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      color: '#333',
                      marginBottom: '4px',
                    }}
                  >
                    {product.product_name}
                  </div>
                  <a
                    href={product.custom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0066cc',
                      textDecoration: 'none',
                      fontSize: '11px',
                      wordBreak: 'break-all',
                    }}
                  >
                    {product.custom_link}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

