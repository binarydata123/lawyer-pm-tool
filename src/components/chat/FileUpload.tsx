import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FileUploadProps {
  channelId?: string;
  onFileUploaded?: () => void;
}

export function FileUpload({ channelId, onFileUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      await supabase.from('files').insert({
        name: selectedFile.name,
        size: selectedFile.size,
        mime_type: selectedFile.type,
        storage_path: fileName,
        uploaded_by: user.id,
        channel_id: channelId || null
      } as any);

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onFileUploaded?.();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="inline-block">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />

      {selectedFile ? (
        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg">
          <File size={16} className="text-slate-600" />
          <span className="text-sm text-slate-700 max-w-xs truncate">
            {selectedFile.name}
          </span>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="file-upload"
          className="cursor-pointer p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
          title="Upload file"
        >
          <Upload size={20} />
        </label>
      )}
    </div>
  );
}
