'use client';
import { useState, useEffect } from 'react';
export default function Home() {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const fetchProjects = async () => {
        setLoadingProjects(true);
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            }
            else {
                console.error('Erro ao buscar projetos:', response.statusText);
                setError('Erro ao carregar projetos.');
            }
        }
        catch (err) {
            console.error('Erro ao buscar projetos:', err);
            setError('Não foi possível conectar ao servidor para carregar projetos.');
        }
        finally {
            setLoadingProjects(false);
        }
    };
    useEffect(() => {
        fetchProjects();
        const interval = setInterval(fetchProjects, 10000); // Atualiza a cada 10 segundos
        return () => clearInterval(interval);
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
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
            }
            else {
                setError(data.error || 'Ocorreu um erro desconhecido.');
            }
        }
        catch (err) {
            console.error(err);
            setError('Não foi possível conectar ao servidor.');
        }
    };
    return (<div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-purple-400">Vídeo Remix AI</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg mb-8">
        <div className="mb-4">
          <label htmlFor="youtubeUrl" className="block text-gray-300 text-sm font-bold mb-2">
            URL do Vídeo do YouTube:
          </label>
          <input type="text" id="youtubeUrl" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-700 border-gray-600" placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} required/>
        </div>
        <div className="flex items-center justify-between">
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300">
            Gerar Vídeo
          </button>
        </div>
      </form>

      {message && (<div className="mt-6 bg-green-600 p-4 rounded-lg shadow-lg w-full max-w-md">
          <p className="font-bold">Sucesso!</p>
          <p>{message}</p>
        </div>)}

      {error && (<div className="mt-6 bg-red-600 p-4 rounded-lg shadow-lg w-full max-w-md">
          <p className="font-bold">Erro!</p>
          <p>{error}</p>
        </div>)}

      <h2 className="text-3xl font-bold mt-12 mb-6 text-purple-400">Meus Projetos</h2>
      {loadingProjects ? (<p>Carregando projetos...</p>) : projects.length === 0 ? (<p>Nenhum projeto encontrado. Comece gerando um vídeo!</p>) : (<div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID do Projeto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">URL do YouTube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {projects.map((project) => (<tr key={project._id.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{project._id.toString().substring(0, 8)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 truncate max-w-xs">
                    <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {project.youtubeUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{project.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {project.status === 'Completed' && project.finalVideoUrl ? (<>
                        <a href={project.finalVideoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600 mr-4">
                          Assistir
                        </a>
                        <a href={project.finalVideoUrl} download className="text-green-400 hover:text-green-600">
                          Baixar
                        </a>
                      </>) : (<span className="text-gray-500">Aguardando...</span>)}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
    </div>);
}
