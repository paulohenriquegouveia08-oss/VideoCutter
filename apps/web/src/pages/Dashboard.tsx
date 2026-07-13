import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

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

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects', { token: token! }),
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Video Cutter</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Meus Projetos</h2>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
            + Novo Projeto
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando projetos...</div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors cursor-pointer"
              >
                <h3 className="font-medium mb-2">{p.name}</h3>
                <p className="text-sm text-gray-400">{p.originalFileName}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-300">
                    {p.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">Nenhum projeto ainda</p>
            <p className="text-sm text-gray-500">
              Crie seu primeiro projeto para começar a cortar vídeos
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
