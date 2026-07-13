import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { ClipCard } from '../components/ClipCard';

interface Clip {
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
}

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const { data: clips, isLoading } = useQuery({
    queryKey: ['clips', id],
    queryFn: () => api<Clip[]>(`/clips/project/${id}`, { token: token! }),
    enabled: !!token && !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Carregando resultados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Resultados</h1>
        <p className="text-sm text-gray-400 mb-8">
          {clips?.length || 0} corte(s) gerado(s)
        </p>

        {clips && clips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} projectId={id!} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            Nenhum corte gerado ainda
          </div>
        )}
      </div>
    </div>
  );
}
