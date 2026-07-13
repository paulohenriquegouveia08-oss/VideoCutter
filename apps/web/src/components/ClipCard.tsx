import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface ClipCardProps {
  clip: {
    id: string;
    sequence: number;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    title: string;
    transcriptText: string;
    status: string;
    score: number;
    approved: boolean;
  };
  projectId: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ClipCard({ clip, projectId }: ClipCardProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => api(`/clips/${clip.id}/approve`, { token: token!, method: 'PUT' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/clips/${clip.id}`, { token: token!, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips', projectId] }),
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="aspect-video bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
        <video
          src={`/api/v1/clips/${clip.id}/download`}
          controls
          className="w-full h-full object-cover"
          preload="metadata"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">Corte {String(clip.sequence).padStart(2, '0')}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${clip.approved ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
            {clip.approved ? 'Aprovado' : 'Pendente'}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-1">
          {formatTime(clip.startSeconds)} até {formatTime(clip.endSeconds)} • {Math.round(clip.durationSeconds)}s
        </p>

        {clip.transcriptText && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{clip.transcriptText}</p>
        )}

        <div className="flex gap-2">
          <a
            href={`/api/v1/clips/${clip.id}/download`}
            className="flex-1 text-center py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs transition-colors"
          >
            Download
          </a>
          <button
            onClick={() => approveMutation.mutate()}
            disabled={clip.approved || approveMutation.isPending}
            className="flex-1 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 rounded-lg text-xs transition-colors"
          >
            Aprovar
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="py-1.5 px-3 bg-red-600/20 text-red-400 hover:bg-red-600/30 disabled:opacity-50 rounded-lg text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
