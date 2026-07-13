import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface Config {
  splitMethod: string;
  selectionMode: string;
  requestedClipCount: number;
  targetDurationSeconds: number;
  minimumDurationSeconds: number;
  maximumDurationSeconds: number;
  outputOrientation: string;
  outputAspectRatio: string;
  cropMode: string;
  generateSubtitles: boolean;
  subtitleStyle: string;
  subtitlePosition: string;
  subtitleLanguage: string;
}

export function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Config>({
    splitMethod: 'COUNT',
    selectionMode: 'SEQUENTIAL',
    requestedClipCount: 10,
    targetDurationSeconds: 60,
    minimumDurationSeconds: 30,
    maximumDurationSeconds: 60,
    outputOrientation: 'HORIZONTAL',
    outputAspectRatio: '16:9',
    cropMode: 'BLUR_BG',
    generateSubtitles: true,
    subtitleStyle: 'DYNAMIC',
    subtitlePosition: 'BOTTOM_CENTER',
    subtitleLanguage: 'pt',
  });

  const saveMutation = useMutation({
    mutationFn: (data: Config) => api(`/projects/${id}/configuration`, { token: token!, method: 'PUT', body: JSON.stringify(data) }),
  });

  const processMutation = useMutation({
    mutationFn: () => api(`/projects/${id}/process`, { token: token!, method: 'POST' }),
    onSuccess: () => navigate(`/results/${id}`),
  });

  const handleSave = async () => {
    await saveMutation.mutateAsync(config);
    await processMutation.mutateAsync();
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">Configurar Cortes</h1>
        <p className="text-sm text-gray-400 mb-8">Etapa {step} de 3</p>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-blue-600' : 'bg-gray-800'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Divisão</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Modo de divisão</label>
              <div className="grid grid-cols-2 gap-3">
                {['COUNT', 'DURATION'].map((m) => (
                  <button key={m} onClick={() => setConfig({ ...config, splitMethod: m })}
                    className={`p-3 rounded-lg border text-sm ${config.splitMethod === m ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'}`}>
                    {m === 'COUNT' ? 'Por Quantidade' : 'Por Duração'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Seleção</label>
              <div className="grid grid-cols-2 gap-3">
                {['SEQUENTIAL', 'HIGHLIGHTS'].map((m) => (
                  <button key={m} onClick={() => setConfig({ ...config, selectionMode: m })}
                    className={`p-3 rounded-lg border text-sm ${config.selectionMode === m ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'}`}>
                    {m === 'SEQUENTIAL' ? 'Sequencial' : 'Melhores Momentos'}
                  </button>
                ))}
              </div>
            </div>
            {config.splitMethod === 'COUNT' ? (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quantidade de cortes</label>
                <input type="number" value={config.requestedClipCount} min={1} max={30}
                  onChange={(e) => setConfig({ ...config, requestedClipCount: +e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duração desejada (segundos)</label>
                  <input type="number" value={config.targetDurationSeconds} min={15} max={180}
                    onChange={(e) => setConfig({ ...config, targetDurationSeconds: +e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mín. (seg)</label>
                <input type="number" value={config.minimumDurationSeconds} min={15}
                  onChange={(e) => setConfig({ ...config, minimumDurationSeconds: +e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Máx. (seg)</label>
                <input type="number" value={config.maximumDurationSeconds} max={180}
                  onChange={(e) => setConfig({ ...config, maximumDurationSeconds: +e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Formato</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Orientação</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'VERTICAL', label: 'Vertical 9:16', ratio: '9:16' },
                  { key: 'HORIZONTAL', label: 'Horizontal 16:9', ratio: '16:9' },
                  { key: 'SQUARE', label: 'Quadrado 1:1', ratio: '1:1' },
                ].map((o) => (
                  <button key={o.key} onClick={() => setConfig({ ...config, outputOrientation: o.key, outputAspectRatio: o.ratio })}
                    className={`p-3 rounded-lg border text-sm ${config.outputOrientation === o.key ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            {config.outputOrientation === 'VERTICAL' && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Enquadramento</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'BLUR_BG', label: 'Fundo Desfocado' },
                    { key: 'CENTER_CROP', label: 'Corte Central' },
                  ].map((c) => (
                    <button key={c.key} onClick={() => setConfig({ ...config, cropMode: c.key })}
                      className={`p-3 rounded-lg border text-sm ${config.cropMode === c.key ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Legendas</h2>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="subtitles" checked={config.generateSubtitles}
                onChange={(e) => setConfig({ ...config, generateSubtitles: e.target.checked })}
                className="w-4 h-4" />
              <label htmlFor="subtitles" className="text-sm">Gerar legendas automaticamente</label>
            </div>
            {config.generateSubtitles && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Estilo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'SIMPLE', label: 'Simples' },
                      { key: 'HIGHLIGHTED', label: 'Destacada' },
                      { key: 'BOXED', label: 'Com Caixa' },
                      { key: 'DYNAMIC', label: 'Dinâmica' },
                    ].map((s) => (
                      <button key={s.key} onClick={() => setConfig({ ...config, subtitleStyle: s.key })}
                        className={`p-3 rounded-lg border text-sm ${config.subtitleStyle === s.key ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-900'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Idioma</label>
                  <select value={config.subtitleLanguage}
                    onChange={(e) => setConfig({ ...config, subtitleLanguage: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm">
                    <option value="pt">Português</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                  </select>
                </div>
              </>
            )}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-6">
              <h3 className="font-medium mb-2">Resumo</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Divisão: {config.splitMethod === 'COUNT' ? `${config.requestedClipCount} cortes` : `${config.targetDurationSeconds}s por corte`}</p>
                <p>Modo: {config.selectionMode === 'SEQUENTIAL' ? 'Sequencial' : 'Melhores Momentos'}</p>
                <p>Formato: {config.outputOrientation} {config.outputAspectRatio}</p>
                {config.outputOrientation === 'VERTICAL' && <p>Enquadramento: {config.cropMode === 'BLUR_BG' ? 'Fundo Desfocado' : 'Corte Central'}</p>}
                <p>Legenda: {config.generateSubtitles ? config.subtitleStyle : 'Sem legenda'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              Voltar
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
              Próximo
            </button>
          ) : (
            <button onClick={handleSave} disabled={saveMutation.isPending || processMutation.isPending}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
              {processMutation.isPending ? 'Iniciando...' : 'Iniciar Processamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
