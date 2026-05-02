import { supabase } from './supabase';

export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  default: 10 * 1024 * 1024 // 10MB
};

export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed'
  ],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
};

export const MAX_MESSAGE_LENGTH = 10000; // Characters
export const LARGE_MESSAGE_THRESHOLD = 2000; // Convert to file if longer

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface ValidationError {
  type: 'size' | 'type' | 'generic';
  message: string;
}

export function validateFile(file: File): ValidationError | null {
  const allAllowedTypes = [
    ...ALLOWED_FILE_TYPES.image,
    ...ALLOWED_FILE_TYPES.document,
    ...ALLOWED_FILE_TYPES.video,
    ...ALLOWED_FILE_TYPES.audio
  ];

  if (!allAllowedTypes.includes(file.type)) {
    return {
      type: 'type',
      message: `File type ${file.type} is not supported. Please upload images, documents, videos, or audio files.`
    };
  }

  let maxSize = FILE_SIZE_LIMITS.default;
  if (ALLOWED_FILE_TYPES.image.includes(file.type)) {
    maxSize = FILE_SIZE_LIMITS.image;
  } else if (ALLOWED_FILE_TYPES.document.includes(file.type)) {
    maxSize = FILE_SIZE_LIMITS.document;
  }

  if (file.size > maxSize) {
    return {
      type: 'size',
      message: `File size exceeds ${formatFileSize(maxSize)}. Please choose a smaller file.`
    };
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}


async function compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<File> {
  const compressableTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!compressableTypes.includes(file.type)) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        resolve(new File([blob], file.name, { type: outputType }));
      }, outputType, quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };
  });
}

export async function uploadFile(
  file: File,
  folder: 'messages' | 'avatars',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (validation) {
    throw new Error(validation.message);
  }

  const fileToUpload = await compressImage(file);

  const fileExt = fileToUpload.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(data.path);

  if (onProgress) {
    onProgress({ loaded: fileToUpload.size, total: fileToUpload.size, percentage: 100 });
  }

  return {
    url: urlData.publicUrl,
    name: fileToUpload.name,
    size: fileToUpload.size,
    type: fileToUpload.type
  };
}

export function getStoragePathFromPublicUrl(
  publicUrl: string,
  bucket = 'attachments'
): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export async function deleteUploadedFile(publicUrl: string): Promise<void> {
  const filePath = getStoragePathFromPublicUrl(publicUrl);
  if (!filePath) return;

  const { error } = await supabase.storage
    .from('attachments')
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

export function createTextFile(content: string, filename: string): File {
  const blob = new Blob([content], { type: 'text/plain' });
  return new File([blob], filename, { type: 'text/plain' });
}

export function shouldConvertToFile(message: string): boolean {
  return message.length > LARGE_MESSAGE_THRESHOLD;
}

export function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf') return '📄';
  if (type.includes('word')) return '📝';
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
  if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
  if (type === 'text/plain') return '📋';
  if (type.includes('zip')) return '🗜️';
  return '📎';
}

export async function pasteImageFromClipboard(
  event: ClipboardEvent
): Promise<File | null> {
  const items = event.clipboardData?.items;
  if (!items) return null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        return new File([file], `pasted-image-${Date.now()}.png`, {
          type: file.type
        });
      }
    }
  }

  return null;
}
