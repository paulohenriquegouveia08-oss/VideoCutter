import { useCallback, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface UploadZoneProps {
  projectId: string;
  onComplete: (metadata: any) => void;
}

export function UploadZone({ projectId, onComplete }: UploadZoneProps) {
  const { token } = useAuth();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError('');
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/v1/projects/${projectId}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        const result = await new Promise<any>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(formData);
        });

        onComplete(result);
      } catch (err: any) {
        setError(err.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [projectId, token, onComplete],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-gray-500 transition-colors"
    >
      {uploading ? (
        <div>
          <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-400">Enviando... {progress}%</p>
        </div>
      ) : (
        <>
          <p className="text-gray-400 mb-4">
            Arraste um vídeo aqui ou
          </p>
          <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium cursor-pointer transition-colors">
            Selecionar arquivo
            <input
              type="file"
              accept=".mp4,.mov,.mkv"
              onChange={onFileSelect}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 mt-3">MP4, MOV ou MKV • Máx. 2GB</p>
        </>
      )}

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}
    </div>
  );
}
