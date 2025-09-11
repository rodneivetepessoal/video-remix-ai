'use client';

import { useState, useEffect } from 'react';
import type { IVideoProject } from '@/lib/models/VideoProject';

interface ProcessingStats {
  total: number;
  completed: number;
  processing: number;
  failed: number;
}

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<IVideoProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({ total: 0, completed: 0, processing: 0, failed: 0 });

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        
        // Calcular estatísticas
        const newStats = data.reduce((acc: ProcessingStats, project: IVideoProject) => {
          acc.total++;
          switch (project.status) {
            case 'Completed':
              acc.completed++;
              break;
            case 'Processing':
              acc.processing++;
              break;
            case 'Failed':
              acc.failed++;
              break;
          }
          return acc;
        }, { total: 0, completed: 0, processing: 0, failed: 0 });
        
        setStats(newStats);
      } else {
        console.error('Erro ao buscar projetos:', response.statusText);
        setError('Erro ao carregar projetos.');
      }
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
      setError('Não foi possível conectar ao servidor para carregar projetos.');
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 8000); // Atualiza a cada 8 segundos
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setYoutubeUrl(''); // Limpa o campo após o envio
        fetchProjects(); // Atualiza a lista de projetos
      } else {
        setError(data.error || 'Ocorreu um erro desconhecido.');
      }
    } catch (err) {
      console.error(err);
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case 'Completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Processing':
        return `${baseClasses} bg-yellow-100 text-yellow-800 animate-pulse`;
      case 'Failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return '✅';
      case 'Processing':
        return '⏳';
      case 'Failed':
        return '❌';
      default:
        return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getProcessingTime = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt);
    const updated = new Date(updatedAt);
    const diffMs = updated.getTime() - created.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ${diffSeconds % 60}s`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Vídeo Remix AI
          </h1>
          <p className="text-gray-300 text-lg">
            Transforme vídeos do YouTube em conteúdo dublado com stock footage
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">{stats.total}</div>
            <div className="text-sm text-gray-300">Total de Projetos</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-sm text-gray-300">Concluídos</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400">{stats.processing}</div>
            <div className="text-sm text-gray-300">Processando</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-sm text-gray-300">Falharam</div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-gray-700">
            <div className="mb-6">
              <label htmlFor="youtubeUrl" className="block text-gray-300 text-sm font-bold mb-3">
                URL do Vídeo do YouTube:
              </label>
              <input
                type="url"
                id="youtubeUrl"
                className="w-full py-3 px-4 text-gray-900 bg-white/90 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:bg-white transition duration-300 placeholder-gray-500"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-300 transform hover:scale-105 disabled:scale-100"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processando...
                </div>
              ) : (
                'Gerar Vídeo'
              )}
            </button>
          </form>
        </div>

        {/* Messages */}
        {message && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-green-600/20 border border-green-500 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-green-400 mr-2">✅</span>
                <div>
                  <p className="font-bold text-green-400">Sucesso!</p>
                  <p className="text-green-300">{message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-600/20 border border-red-500 p-4 rounded-lg backdrop-blur-sm">
              <div className="flex items-center">
                <span className="text-red-400 mr-2">❌</span>
                <div>
                  <p className="font-bold text-red-400">Erro!</p>
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Section */}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-purple-400">Meus Projetos</h2>
            <div className="text-sm text-gray-400">
              Atualização automática a cada 8 segundos
            </div>
          </div>

          {loadingProjects ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando projetos...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-lg">Nenhum projeto encontrado.</p>
              <p className="text-gray-500">Comece gerando um vídeo!</p>
            </div>
          ) : (
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">URL do YouTube</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Criado</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tempo</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {projects.map((project) => (
                      <tr key={project._id.toString()} className="hover:bg-gray-800/30 transition duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">{getStatusIcon(project.status)}</span>
                            <span className={getStatusBadge(project.status)}>
                              {project.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="max-w-xs truncate">
                            <a 
                              href={project.youtubeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-400 hover:text-blue-300 hover:underline transition duration-200"
                            >
                              {project.youtubeUrl}
                            </a>
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {project._id.toString().substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(project.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {getProcessingTime(project.createdAt, project.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {project.status === 'Completed' && project.renderId ? (
                            <div className="flex space-x-2">
                              <a
                                href={`/api/video-proxy/${project.renderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition duration-200"
                              >
                                Assistir
                              </a>
                              <a
                                href={`/api/video-proxy/${project.renderId}`}
                                download={`video-remix-${project.renderId.substring(0, 8)}.mp4`}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition duration-200"
                              >
                                Baixar
                              </a>
                            </div>
                          ) : project.status === 'Processing' ? (
                            <div className="flex items-center text-yellow-400">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                              <span className="text-xs">Processando...</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs">Aguardando...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Vídeo Remix AI - Powered by Next.js, MongoDB, Pexels, Shotstack & TTS</p>
        </div>
      </div>
    </div>
  );
}

