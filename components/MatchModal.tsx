import React, { useState } from 'react';
import { X, Trophy, Swords, Calendar } from 'lucide-react';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (matchData: any) => void;
  wrestlerNames: string[];
}

export const MatchModal: React.FC<MatchModalProps> = ({ isOpen, onClose, onSubmit, wrestlerNames }) => {
  const [season, setSeason] = useState<number>(1);
  const [episode, setEpisode] = useState<number>(1);
  const [winner, setWinner] = useState('');
  const [loser, setLoser] = useState('');
  const [isTitleMatch, setIsTitleMatch] = useState(false);
  const [titleName, setTitleName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!season || !episode || !winner || !loser) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    if (winner === loser) {
      setError('El ganador y el perdedor no pueden ser la misma persona.');
      return;
    }

    const showName = `Temporada ${season} - Episodio ${episode}`;

    onSubmit({
      season: Number(season),
      episode: Number(episode),
      show: showName,
      winner,
      loser,
      isTitleMatch,
      titleName: isTitleMatch ? titleName : undefined,
      timestamp: Date.now()
    });
    
    // Reset fields partly
    setWinner('');
    setLoser('');
    setIsTitleMatch(false);
    setTitleName('');
    setError('');
    // Keep season/episode as is for easier data entry of next match
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
          <h3 className="text-xl font-bold text-hoyo-accent flex items-center gap-2">
            <Swords size={20} />
            Registrar Combate
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar size={14} /> Temporada
              </label>
              <input 
                type="number" 
                min="1"
                value={season}
                onChange={(e) => setSeason(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-hoyo-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Episodio</label>
              <input 
                type="number" 
                min="1"
                value={episode}
                onChange={(e) => setEpisode(parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-hoyo-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-1">Ganador</label>
              <select 
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="">Seleccionar</option>
                {wrestlerNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-red-400 mb-1">Perdedor</label>
              <select 
                value={loser}
                onChange={(e) => setLoser(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="">Seleccionar</option>
                {wrestlerNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer" onClick={() => setIsTitleMatch(!isTitleMatch)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isTitleMatch ? 'bg-hoyo-gold border-hoyo-gold text-black' : 'border-zinc-600'}`}>
              {isTitleMatch && <Trophy size={12} />}
            </div>
            <span className="text-sm font-medium text-zinc-300">Es combate por título</span>
          </div>

          {isTitleMatch && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-medium text-hoyo-gold mb-1">Nombre del Título</label>
              <input 
                type="text" 
                value={titleName}
                onChange={(e) => setTitleName(e.target.value)}
                placeholder="Ej. Cinturón Mundial"
                className="w-full bg-zinc-950 border border-hoyo-gold/50 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-hoyo-gold focus:outline-none"
              />
            </div>
          )}

          <div className="pt-2">
            <button type="submit" className="w-full bg-hoyo-accent hover:bg-red-700 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-900/20">
              Registrar Resultado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};