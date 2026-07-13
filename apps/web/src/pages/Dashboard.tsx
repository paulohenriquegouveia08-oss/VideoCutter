import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { UploadZone } from '../components/UploadZone';

interface Project {
  id: string;
  name: string;
  originalFileName: string;
  status: string;
  durationSeconds: number;
  createdAt: string;
}

export function DashboardPage() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [projectName, setProjectName] = useState('');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects', { token: token! }),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api<{ id: string }>('/projects', { token: token!, method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowNew(false);
      setProjectName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/projects/${id}`, { token: token!, method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Video Cutter</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition-colors">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Meus Projetos</h2>
          <button onClick={() => setShowNew(!showNew)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
            {showNew ? 'Cancelar' : '+ Novo Projeto'}
          </button>
        </div>

        {showNew && (
          <div className="mb-6 p-6 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome do projeto</label>
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Podcast Episódio 01"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={() => projectName && createMutation.mutate(projectName)} disabled={!projectName || createMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
              {createMutation.isPending ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando projetos...</div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id}
                className="p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => p.status === 'CREATED' ? navigate(`/configure/${p.id}`) : navigate(`/results/${p.id}`)}>
                <h3 className="font-medium mb-1">{p.name}</h3>
                <p className="text-xs text-gray-500 mb-3">{p.originalFileName || 'Sem arquivo'}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'UPLOADED' ? 'bg-blue-500/20 text-blue-400' : p.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                    {p.status}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(p.id); }}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">Nenhum projeto ainda</p>
            <p className="text-sm text-gray-500">Clique em "+ Novo Projeto" para começar</p>
          </div>
        )}
      </main>
    </div>
  );
}
