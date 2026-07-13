import { useAuth } from '../hooks/useAuth';

interface VideoPlayerProps {
  projectId: string;
  type?: 'original' | 'preview';
}

export function VideoPlayer({ projectId, type = 'original' }: VideoPlayerProps) {
  const { token } = useAuth();
  const endpoint = type === 'preview' ? 'preview' : 'video';

  return (
    <div className="rounded-xl overflow-hidden bg-black">
      <video
        src={`/api/v1/projects/${projectId}/${endpoint}`}
        controls
        className="w-full max-h-[500px]"
        preload="metadata"
      >
        Seu navegador não suporta vídeo.
      </video>
    </div>
  );
}
