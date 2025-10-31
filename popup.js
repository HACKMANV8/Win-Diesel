
// Popup script for YouTube Upload Transcriber (AssemblyAI version)
console.log('YouTube Upload Transcriber popup loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup initialized - AssemblyAI version');
    
    // Add click handler to open YouTube Studio
    const studioLink = document.querySelector('code');
    if (studioLink && studioLink.textContent === 'studio.youtube.com') {
        studioLink.style.cursor = 'pointer';
        studioLink.style.textDecoration = 'underline';
        studioLink.addEventListener('click', function() {
            if (chrome && chrome.tabs) {
                chrome.tabs.create({ url: 'https://studio.youtube.com' });
            }
        });
    }
});

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM ready, initializing...');
    
    // Get all elements
    const videoInput = document.getElementById('videoInput');
    const videoStatus = document.getElementById('videoStatus');
    const convertBtn = document.getElementById('convertBtn');
    const convertStatus = document.getElementById('convertStatus');
    const transcriptBox = document.getElementById('transcriptBox');
    const copyBtn = document.getElementById('copyBtn');

    // Check if all elements exist
    if (!videoInput || !videoStatus || !convertBtn || !convertStatus || !transcriptBox || !copyBtn) {
        console.error('❌ Missing DOM elements');
        return;
    }

    console.log('✅ All DOM elements found');

    // File selection handler - simplified to prevent crashes
    videoInput.addEventListener('change', function(e) {
        console.log('📁 File selection event triggered');
        
        // Reset everything first
        selectedFile = null;
        convertBtn.disabled = true;
        videoStatus.textContent = 'Processing file selection...';
        videoStatus.className = 'status';
        
        // Use setTimeout to prevent blocking the UI thread
        setTimeout(() => {
            try {
                if (!e.target || !e.target.files) {
                    console.log('📁 No files object');
                    videoStatus.textContent = 'No file selected';
                    return;
                }
                
                if (e.target.files.length === 0) {
                    console.log('📁 No files selected');
                    videoStatus.textContent = 'No file selected';
                    return;
                }
                
                const file = e.target.files[0];
                console.log('📁 File object:', {
                    name: file.name,
                    type: file.type,
                    size: file.size
                });
                
                // Basic validation without heavy operations
                if (!file.name) {
                    throw new Error('Invalid file');
                }
                
                const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                
                // Check file size limit
                if (file.size > 25 * 1024 * 1024) { // 25MB limit
                    throw new Error(`File too large: ${sizeMB}MB (max 25MB)`);
                }
                
                selectedFile = file;
                videoStatus.textContent = `✅ Selected: ${file.name} (${sizeMB} MB)`;
                videoStatus.className = 'status success';
                convertBtn.disabled = false;
                
                console.log('✅ File selected successfully');
                
            } catch (error) {
                console.error('❌ File selection error:', error);
                selectedFile = null;
                convertBtn.disabled = true;
                videoStatus.textContent = `❌ Error: ${error.message}`;
                videoStatus.className = 'status error';
            }
        }, 10); // Small delay to prevent UI blocking
    });

    // Copy button handler
    copyBtn.addEventListener('click', function() {
        console.log('📋 Copy button clicked');
        
        try {
            if (transcriptBox.value && transcriptBox.value.trim()) {
                navigator.clipboard.writeText(transcriptBox.value).then(() => {
                    console.log('✅ Text copied to clipboard');
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copy Transcript';
                    }, 2000);
                }).catch(err => {
                    console.error('❌ Copy failed:', err);
                    // Fallback for older browsers
                    try {
                        transcriptBox.select();
                        document.execCommand('copy');
                        copyBtn.textContent = '✅ Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = '📋 Copy Transcript';
                        }, 2000);
                    } catch (fallbackErr) {
                        console.error('❌ Fallback copy also failed:', fallbackErr);
                        copyBtn.textContent = '❌ Copy Failed';
                        setTimeout(() => {
                            copyBtn.textContent = '📋 Copy Transcript';
                        }, 2000);
                    }
                });
            } else {
                console.log('⚠️ No transcript to copy');
                copyBtn.textContent = '⚠️ No Text';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy Transcript';
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Copy handler error:', error);
        }
    });

    // Convert button handler - crash-resistant version
    convertBtn.addEventListener('click', function() {
        console.log('🚀 Convert button clicked');
        
        // Basic validation first
        if (!selectedFile) {
            console.log('❌ No file selected');
            convertStatus.textContent = '❌ No file selected';
            convertStatus.className = 'status error';
            return;
        }

        // Disable button immediately
        convertBtn.disabled = true;
        convertBtn.textContent = '⏳ Processing...';
        transcriptBox.value = '';
        convertStatus.textContent = 'Starting transcription...';
        convertStatus.className = 'status';

        // Use setTimeout to prevent UI blocking
        setTimeout(async () => {
            try {
                console.log('🎵 Validating file...');
                
                // Step 1: Validate file
                const processedFile = await convertVideoToAudio(selectedFile);
                
                convertStatus.textContent = 'Sending to Whisper API...';
                console.log('📤 Sending file to Whisper API...');
                
                // Step 2: Send file to Whisper
                const transcript = await sendToWhisperAPI(processedFile);
                
                // Display result
                transcriptBox.value = transcript;
                convertStatus.textContent = '✅ Transcription completed successfully!';
                convertStatus.className = 'status success';
                
                console.log('✅ Transcription successful');
                
            } catch (error) {
                console.error('❌ Transcription error:', error);
                convertStatus.textContent = `❌ Error: ${error.message}`;
                convertStatus.className = 'status error';
                transcriptBox.value = `Error: ${error.message}`;
            } finally {
                convertBtn.disabled = false;
                convertBtn.textContent = '🚀 Convert & Transcribe';
            }
        }, 50); // Small delay to let UI update
    });

    console.log('🎯 All event listeners attached successfully');
});

// Simplified approach: Just send the video file directly to Whisper
// Whisper API can handle many video formats directly
async function convertVideoToAudio(videoFile) {
    console.log('🎵 Preparing video for Whisper API...');
    
    // Check file size (Whisper has a 25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (videoFile.size > maxSize) {
        throw new Error(`File too large: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB. Maximum is 25MB.`);
    }
    
    // Whisper actually accepts many video formats directly
    // So we'll just return the video file itself
    console.log('✅ Video file ready for Whisper API');
    return videoFile;
}

// Send audio file to Whisper API
// Send file to Whisper API (can handle video or audio)
async function sendToWhisperAPI(file) {
    console.log('🎙️ Preparing Whisper API request...');
    
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');
        formData.append('response_format', 'text');
        
        console.log('📡 Sending file to OpenAI Whisper API...');
        console.log('📊 File details:', {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        });
        
        // Make API request
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
        });
        
        console.log('📨 API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API error response:', errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.text(); // Get as text since we set response_format to text
        console.log('✅ Transcript received, length:', result.length);
        
        if (!result || result.trim() === '') {
            throw new Error('Empty transcript returned from API');
        }
        
        return result.trim();
        
    } catch (error) {
        console.error('❌ Whisper API error:', error);
        throw new Error(`Transcription failed: ${error.message}`);
    }
}