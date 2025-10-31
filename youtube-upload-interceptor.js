// YouTube Studio Upload Interceptor - AssemblyAI Version
console.log('🎬 YouTube Studio upload interceptor loaded (AssemblyAI)');

//const ASSEMBLYAI_API_KEY = '7f1e85b59f164fed8cd4542af400e11c';
let ASSEMBLYAI_API_KEY = '';

fetch(chrome.runtime.getURL('config.json'))
  .then(res => res.json())
  .then(config => {
      ASSEMBLYAI_API_KEY = config.assemblyai_api_key;
      console.log('🔑 Loaded AssemblyAI key from config.json');
      initialize(); // Start once the key is ready
  })
  .catch(err => {
      console.error('⚠️ Failed to load API key:', err);
      initialize(); // still run, so extension doesn’t freeze
  });


let transcriptPanel = null;
let isProcessing = false;

// Monitor for file input changes (video uploads)
function interceptFileUploads() {
    console.log('🔍 Setting up file upload monitoring...');
    
    // Function to add listener to file input
    function addFileInputListener(input) {
        if (input.dataset.transcriptListenerAdded) {
            return; // Already has listener
        }
        
        console.log('📂 Adding listener to file input:', input);
        input.dataset.transcriptListenerAdded = 'true';
        
        input.addEventListener('change', async function(event) {
            console.log('📁 File input changed');
            const files = event.target.files;
            if (files && files.length > 0) {
                const file = files[0];
                console.log('📹 File detected:', file.name, file.type, file.size);
                
                // Check if it's a video file
                if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm|flv|m4v)$/i)) {
                    console.log('✅ Video file confirmed, starting transcription...');
                    await processVideoFile(file);
                } else {
                    console.log('ℹ️ Non-video file, skipping:', file.type);
                }
            }
        });
    }
    
    // Monitor existing file inputs
    const existingInputs = document.querySelectorAll('input[type="file"]');
    existingInputs.forEach(addFileInputListener);
    
    // Monitor for new file inputs using MutationObserver
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // Check the node itself
                    if (node.tagName === 'INPUT' && node.type === 'file') {
                        addFileInputListener(node);
                    }
                    
                    // Check child nodes
                    const newFileInputs = node.querySelectorAll && node.querySelectorAll('input[type="file"]');
                    if (newFileInputs) {
                        newFileInputs.forEach(addFileInputListener);
                    }
                }
            });
        });
    });
    
    // Start observing with comprehensive options
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
    } else {
        // If body not ready, wait for it
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });
        });
    }
    
    console.log('✅ File upload monitoring active');
}

// Process the video file for transcription
async function processVideoFile(videoFile) {
    if (isProcessing) {
        console.log('⚠️ Already processing a video, skipping...');
        return;
    }
    
    isProcessing = true;
    
    try {
        console.log('🎵 Starting video transcription process...');
        
        // Create or update transcript panel
        createTranscriptPanel();
        updateTranscriptPanel('🎵 Processing video: ' + videoFile.name, 'processing');
        
        // Check file size (AssemblyAI can handle larger files than Whisper)
        if (videoFile.size > 100 * 1024 * 1024) { // 100MB limit
            throw new Error(`Video file too large: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB. Max size is 100MB.`);
        }
        
        updateTranscriptPanel('📤 Uploading video to AssemblyAI...', 'processing');
        
        // Send to AssemblyAI for transcription
        const transcript = await transcribeWithAssemblyAI(videoFile);
        
        // Display the transcript
        updateTranscriptPanel(transcript, 'success');
        
        console.log('✅ Transcription completed successfully');
        
    } catch (error) {
        console.error('❌ Transcription error:', error);
        updateTranscriptPanel('❌ Error: ' + error.message, 'error');
    } finally {
        isProcessing = false;
    }
}

// Create transcript display panel
function createTranscriptPanel() {
    if (transcriptPanel) {
        return; // Panel already exists
    }
    
    console.log('🎨 Creating transcript panel...');
    
    transcriptPanel = document.createElement('div');
    transcriptPanel.id = 'transcript-panel';
    transcriptPanel.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        background: white;
        border: 2px solid #1976d2;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Roboto', Arial, sans-serif;
        overflow: hidden;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = 'background: #1976d2; color: white; padding: 12px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;';
    
    const title = document.createElement('span');
    title.textContent = '📝 Video Transcript';
    header.appendChild(title);
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'close-transcript';
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background: none; border: none; color: white; cursor: pointer; font-size: 18px;';
    header.appendChild(closeBtn);
    
    // Create content area
    const content = document.createElement('div');
    content.id = 'transcript-content';
    content.style.cssText = 'padding: 16px; max-height: 400px; overflow-y: auto; line-height: 1.5;';
    content.textContent = 'Ready to transcribe videos...';
    
    // Create footer with copy button
    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px; background: #f5f5f5; border-top: 1px solid #ddd;';
    
    const copyBtn = document.createElement('button');
    copyBtn.id = 'copy-transcript';
    copyBtn.textContent = '📋 Copy Transcript';
    copyBtn.style.cssText = 'background: #1976d2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%;';
    footer.appendChild(copyBtn);
    
    // Assemble panel
    transcriptPanel.appendChild(header);
    transcriptPanel.appendChild(content);
    transcriptPanel.appendChild(footer);
    
    document.body.appendChild(transcriptPanel);
    
    // Add event listeners using proper event delegation
    transcriptPanel.addEventListener('click', function(e) {
        if (e.target.id === 'close-transcript') {
            transcriptPanel.remove();
            transcriptPanel = null;
        } else if (e.target.id === 'copy-transcript') {
            const content = document.getElementById('transcript-content').textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(content).then(() => {
                    e.target.textContent = '✅ Copied!';
                    setTimeout(() => {
                        e.target.textContent = '📋 Copy Transcript';
                    }, 2000);
                }).catch(() => {
                    // Fallback for copy
                    copyToClipboardFallback(content, e.target);
                });
            } else {
                copyToClipboardFallback(content, e.target);
            }
        }
    });
}

// Fallback copy function
function copyToClipboardFallback(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        button.textContent = '✅ Copied!';
        setTimeout(() => {
            button.textContent = '📋 Copy Transcript';
        }, 2000);
    } catch (err) {
        button.textContent = '❌ Copy Failed';
        setTimeout(() => {
            button.textContent = '📋 Copy Transcript';
        }, 2000);
    }
    
    document.body.removeChild(textArea);
}

// Update transcript panel content
function updateTranscriptPanel(content, status = 'info') {
    if (!transcriptPanel) {
        createTranscriptPanel();
    }
    
    const contentDiv = document.getElementById('transcript-content');
    if (contentDiv) {
        contentDiv.textContent = content;
        
        // Style based on status
        switch (status) {
            case 'processing':
                contentDiv.style.color = '#1976d2';
                contentDiv.style.fontStyle = 'italic';
                break;
            case 'success':
                contentDiv.style.color = '#2e7d32';
                contentDiv.style.fontStyle = 'normal';
                break;
            case 'error':
                contentDiv.style.color = '#d32f2f';
                contentDiv.style.fontStyle = 'normal';
                break;
            default:
                contentDiv.style.color = '#333';
                contentDiv.style.fontStyle = 'normal';
        }
    }
}

// Transcribe video using AssemblyAI
async function transcribeWithAssemblyAI(videoFile) {
    // Step 1: Upload file to AssemblyAI
console.log('📤 Uploading file to AssemblyAI...');
updateTranscriptPanel('📤 Uploading file to AssemblyAI...', 'processing');

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk
const uploadUrl = 'https://api.assemblyai.com/v2/upload';

let start = 0;
let audioUrl = '';

while (start < videoFile.size) {
  const chunk = videoFile.slice(start, start + CHUNK_SIZE);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY
    },
    body: chunk
  });

  if (!response.ok) {
    throw new Error(`Chunk upload failed: ${response.status}`);
  }

  const data = await response.json();
  audioUrl = data.upload_url; // AssemblyAI returns the same URL for the file
  start += CHUNK_SIZE;
  console.log(`📤 Uploaded ${(start / 1024 / 1024).toFixed(2)}MB`);
}

console.log('✅ File fully uploaded, URL:', audioUrl);

        
        // Step 2: Request transcription
        console.log('🎵 Requesting transcription...');
        updateTranscriptPanel('🎵 Processing transcription...', 'processing');
        
        const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
                'authorization': ASSEMBLYAI_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                audio_url: audioUrl,
                language_detection: true
            })
        });
        
        if (!transcriptResponse.ok) {
            throw new Error(`Transcription request failed: ${transcriptResponse.status}`);
        }
        
        const transcriptData = await transcriptResponse.json();
        const transcriptId = transcriptData.id;
        console.log('✅ Transcription started, ID:', transcriptId);
        
        // Step 3: Poll for completion
        console.log('⏳ Waiting for transcription to complete...');
        updateTranscriptPanel('⏳ Transcription in progress...', 'processing');
        
        let transcript = null;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            
            const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY
                }
            });
            
            if (!pollResponse.ok) {
                throw new Error(`Polling failed: ${pollResponse.status}`);
            }
            
            const pollData = await pollResponse.json();
            console.log('📊 Transcription status:', pollData.status);
            
            if (pollData.status === 'completed') {
                transcript = pollData.text;
                break;
            } else if (pollData.status === 'error') {
                throw new Error(`Transcription failed: ${pollData.error}`);
            }
            
            attempts++;
            updateTranscriptPanel(`⏳ Transcription in progress... (${attempts * 5}s)`, 'processing');
        }
        
        if (!transcript) {
            throw new Error('Transcription timed out after 5 minutes');
        }
        
        if (!transcript.trim()) {
            throw new Error('Empty transcript returned');
        }
        
        console.log('✅ Transcription completed, length:', transcript.length);
        return transcript.trim();
        
    } catch (error) {
        console.error('❌ AssemblyAI error:', error);
        throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
}

// Initialize when page loads
function initialize() {
    console.log('🚀 Initializing YouTube upload interceptor...');
    
    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptFileUploads);
    } else {
        interceptFileUploads();
    }
    
    // Also run after a delay to catch dynamically loaded elements
    setTimeout(interceptFileUploads, 2000);
    setTimeout(interceptFileUploads, 5000);
}

// Start the interceptor
initialize();