import axios from 'axios';

const ASSEMBLYAI_API_KEY = '3c2ac5b226754c4493a3ae5b06f1c1de';
const ASSEMBLYAI_UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const ASSEMBLYAI_TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';

export type TranscriptionStatus = 'idle' | 'uploading' | 'transcribing' | 'completed' | 'error';

export interface TranscriptionResult {
  transcript: string;
  status: TranscriptionStatus;
  error?: string;
}

function verifyVideoFileHeader(arrayBuffer: ArrayBuffer): boolean {
  // Check file header/magic bytes to verify it's actually a video file
  const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
  
  // MP4 files start with: ftyp box (ftyp at offset 4)
  // Look for 'ftyp' at position 4-8
  const mp4Magic = [0x66, 0x74, 0x79, 0x70]; // 'ftyp' in hex
  const hasMp4Header = 
    bytes[4] === mp4Magic[0] && 
    bytes[5] === mp4Magic[1] && 
    bytes[6] === mp4Magic[2] && 
    bytes[7] === mp4Magic[3];
  
  // Also check for mov/quicktime (can start with ftyp too)
  const quicktimeBrand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  
  console.log('[AssemblyAI] File header check:', {
    first12Bytes: Array.from(bytes),
    hasMp4Header,
    quicktimeBrand
  });
  
  return hasMp4Header;
}

async function uploadVideoToAssemblyAI(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  console.log('[AssemblyAI] Uploading video from ArrayBuffer:', fileName, arrayBuffer.byteLength, 'bytes');
  
  // Verify the file header to ensure it's actually a video file
  if (!verifyVideoFileHeader(arrayBuffer)) {
    console.warn('[AssemblyAI] File header doesn\'t match expected video format, but proceeding anyway');
  }
  
  // Determine MIME type from extension
  const fileNameLower = fileName.toLowerCase();
  let mimeType = 'video/mp4'; // Default
  if (fileNameLower.endsWith('.mov')) {
    mimeType = 'video/quicktime';
  } else if (fileNameLower.endsWith('.avi')) {
    mimeType = 'video/x-msvideo';
  } else if (fileNameLower.endsWith('.webm')) {
    mimeType = 'video/webm';
  }
  
  // Upload raw binary data directly
  // AssemblyAI accepts raw binary uploads with proper content-type
  try {
    console.log('[AssemblyAI] Uploading raw binary data, type:', mimeType);
    const response = await fetch(ASSEMBLYAI_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': mimeType, // Set content-type explicitly for binary upload
      },
      body: arrayBuffer, // Upload raw ArrayBuffer directly
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AssemblyAI] Upload failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[AssemblyAI] Upload successful, URL:', data.upload_url);
    return data.upload_url;
  } catch (error: any) {
    console.error('[AssemblyAI] Upload failed:', error);
    throw new Error(`Upload failed: ${error?.message || 'Unknown error'}`);
  }
}

async function startTranscription(uploadUrl: string): Promise<string> {
  console.log('[AssemblyAI] Starting transcription for URL:', uploadUrl);
  try {
    const response = await axios.post(
      ASSEMBLYAI_TRANSCRIPT_URL,
      {
        audio_url: uploadUrl,
      },
      {
        headers: {
          authorization: ASSEMBLYAI_API_KEY,
          'content-type': 'application/json',
        },
      }
    );

    console.log('[AssemblyAI] Transcription started, ID:', response.data.id);
    return response.data.id;
  } catch (error: any) {
    console.error('[AssemblyAI] Failed to start transcription:', error);
    throw new Error(`Failed to start transcription: ${error?.response?.data?.error || error?.message || 'Unknown error'}`);
  }
}

async function pollTranscriptionStatus(
  transcriptId: string,
  onStatusUpdate?: (status: TranscriptionStatus) => void
): Promise<TranscriptionResult> {
  return new Promise((resolve) => {
    let pollCount = 0;
    const maxPolls = 120; // 6 minutes max (120 * 3 seconds)
    
    const poll = async () => {
      try {
        pollCount++;
        console.log(`[AssemblyAI] Polling transcription status (attempt ${pollCount}/${maxPolls})`);
        
        const response = await axios.get(`${ASSEMBLYAI_TRANSCRIPT_URL}/${transcriptId}`, {
          headers: {
            authorization: ASSEMBLYAI_API_KEY,
          },
        });

        const status = response.data.status;
        console.log('[AssemblyAI] Transcription status:', status);

        if (status === 'completed') {
          const transcript = response.data.text || '';
          console.log('[AssemblyAI] Transcription completed, length:', transcript.length);
          resolve({
            transcript,
            status: 'completed',
          });
        } else if (status === 'error') {
          const errorMsg = response.data.error || 'Transcription failed';
          console.error('[AssemblyAI] Transcription error:', errorMsg);
          resolve({
            transcript: '',
            status: 'error',
            error: errorMsg,
          });
        } else {
          // Still processing - update status and poll again
          if (onStatusUpdate) {
            onStatusUpdate('transcribing');
          }
          
          if (pollCount >= maxPolls) {
            console.error('[AssemblyAI] Max polling attempts reached');
            resolve({
              transcript: '',
              status: 'error',
              error: 'Transcription timed out',
            });
          } else {
            setTimeout(poll, 3000);
          }
        }
      } catch (error: any) {
        console.error('[AssemblyAI] Polling error:', error);
        resolve({
          transcript: '',
          status: 'error',
          error: error?.message || 'Failed to check transcription status',
        });
      }
    };

    poll();
  });
}

export async function transcribeVideo(
  fileData: ArrayBuffer,
  fileName: string,
  onStatusUpdate?: (status: TranscriptionStatus) => void
): Promise<TranscriptionResult> {
  try {
    // Step 1: Upload video
    if (onStatusUpdate) {
      onStatusUpdate('uploading');
    }
    const uploadUrl = await uploadVideoToAssemblyAI(fileData, fileName);

    // Step 2: Start transcription
    if (onStatusUpdate) {
      onStatusUpdate('transcribing');
    }
    const transcriptId = await startTranscription(uploadUrl);

    // Step 3: Poll for completion
    return await pollTranscriptionStatus(transcriptId, onStatusUpdate);
  } catch (error: any) {
    return {
      transcript: '',
      status: 'error',
      error: error?.message || 'Failed to transcribe video',
    };
  }
}

