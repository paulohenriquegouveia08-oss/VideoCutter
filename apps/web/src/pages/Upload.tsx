import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { UploadZone } from '../components/UploadZone';
import { VideoPlayer } from '../components/VideoPlayer';

interface Project {
  id: string;
  name: string;
  originalFileName: string;
  status: string;
  durationSeconds: number;
  width: number;
  height: number;
  orientation: string;
}

export function UploadPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [uploadDone, setUploadDone] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api<Project>(`/projects/${id}`, { token: token! }),
    enabled: !!token && !!id,
  });

  const handleUploadComplete = (metadata: any) => {
    setUploadDone(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Projeto não encontrado</p>
      </div>
    );
  }

  const hasVideo = project.status === 'UPLOADED' || uploadDone;

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
            ← Voltar
          </button>
          <h1 className="text-lg font-bold">{project.name}</h1>
          <div />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-8">
          {['Upload', 'Configurar', 'Resultado'].map((step, i) => {
            const active = i === 0 && !hasVideo;
            const done = i === 0 && hasVideo;
            return (
              <div key={step} className={`h-1 flex-1 rounded ${done ? 'bg-green-500' : active ? 'bg-blue-600' : 'bg-gray-800'}`} />
            );
          })}
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Upload do Vídeo</h2>
          <p className="text-sm text-gray-400">Envie o vídeo que deseja cortar</p>
        </div>

        {!hasVideo ? (
          <UploadZone projectId={id!} onComplete={handleUploadComplete} />
        ) : (
          <div className="space-y-6">
            <VideoPlayer projectId={id!} />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Duração</p>
                <p className="font-medium">{Math.floor(project.durationSeconds / 60)}min {Math.floor(project.durationSeconds % 60)}s</p>
              </div>
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Resolução</p>
                <p className="font-medium">{project.width}×{project.height}</p>
              </div>
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Orientação</p>
                <p className="font-medium">{project.orientation}</p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => navigate(`/configure/${id}`)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Configurar Cortes →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
