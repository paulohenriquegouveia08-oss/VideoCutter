import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface ProcessStatus {
  projectStatus: string;
  projectName: string;
  currentJob: {
    status: string;
    progress: number;
    message: string;
  } | null;
  totalClips: number;
  clips: any[];
}

const STAGES = ['PENDENTE', 'EXTRACTING_AUDIO', 'ANALYZING', 'SELECTING_CLIPS', 'RENDERING', 'COMPLETED'];

const STAGE_LABELS: Record<string, string> = {
  PENDENTE: 'Aguardando...',
  EXTRACTING_AUDIO: 'Extraindo áudio',
  ANALYZING: 'Analisando áudio',
  SELECTING_CLIPS: 'Selecionando trechos',
  RENDERING: 'Renderizando vídeos',
  COMPLETED: 'Concluído',
};

export function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data: status } = useQuery<ProcessStatus>({
    queryKey: ['process-status', id],
    queryFn: () => api(`/projects/${id}/process-status`, { token: token! }),
    enabled: !!token && !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.projectStatus === 'COMPLETED') return false;
      if (data?.projectStatus === 'FAILED') return false;
      return 2000;
    },
  });

  if (!status) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  const isDone = status.projectStatus === 'COMPLETED';
  const isFailed = status.projectStatus === 'FAILED';
  const progress = status.currentJob?.progress || 0;
  const message = status.currentJob?.message || '';
  const currentStage = STAGES.find((s) => {
    if (message.includes('Extraindo')) return s === 'EXTRACTING_AUDIO';
    if (message.includes('Analisando')) return s === 'ANALYZING';
    if (message.includes('Selecionando')) return s === 'SELECTING_CLIPS';
    if (message.includes('Renderizando') || message.includes('Clip')) return s === 'RENDERING';
    return false;
  }) || (isDone ? 'COMPLETED' : 'PENDENTE');

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">{status.projectName}</h1>
        <p className="text-sm text-gray-400 mb-8">Processamento do vídeo</p>

        <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${isFailed ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-sm text-gray-300 mb-2">{progress}% — {message || 'Iniciando...'}</p>

        <div className="space-y-3 mt-8">
          {STAGES.filter((s) => s !== 'PENDENTE').map((stage) => {
            const stageIdx = STAGES.indexOf(stage);
            const currentIdx = STAGES.indexOf(currentStage);
            const isComplete = stageIdx < currentIdx || (isDone && stage === 'COMPLETED');
            const isCurrent = stage === currentStage && !isDone;

            return (
              <div key={stage} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isComplete ? 'bg-green-500' : isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`} />
                <span className={`text-sm ${isComplete ? 'text-green-400' : isCurrent ? 'text-white' : 'text-gray-500'}`}>
                  {STAGE_LABELS[stage] || stage}
                </span>
              </div>
            );
          })}
        </div>

        {isDone && (
          <div className="mt-8 text-center">
            <p className="text-green-400 font-medium mb-4">
              {status.totalClips} corte(s) gerado(s)!
            </p>
            <button
              onClick={() => navigate(`/results/${id}`)}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              Ver Resultados
            </button>
          </div>
        )}

        {isFailed && (
          <div className="mt-8 text-center">
            <p className="text-red-400 font-medium mb-4">Falha no processamento</p>
            <p className="text-sm text-gray-400 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
