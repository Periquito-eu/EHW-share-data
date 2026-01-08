import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  BarChart3, 
  Lightbulb, 
  Database,
  Plus,
  Trash2,
  TrendingUp,
  Download,
  Upload,
  BrainCircuit,
  Medal,
  Skull,
  Swords,
  Dices,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { INITIAL_ROSTER } from './constants';
import { Match, Wrestler, AppTab } from './types';
import { calculateStats } from './utils/logic';
import { MatchModal } from './components/MatchModal';
import { generateRosterAnalysis, generateWrestlerBio } from './services/geminiService';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.RANKING);
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('hoyo_matches');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [rosterNames, setRosterNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('hoyo_roster');
    return saved ? JSON.parse(saved) : INITIAL_ROSTER;
  });

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedWrestlerId, setSelectedWrestlerId] = useState<string | null>(null);
  
  // UI State for Timeline Accordions
  const [expandedSeasons, setExpandedSeasons] = useState<Record<number, boolean>>({});
  const [expandedEpisodes, setExpandedEpisodes] = useState<Record<string, boolean>>({});

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wrestlerBio, setWrestlerBio] = useState<string>('');
  const [customWrestlerInfo, setCustomWrestlerInfo] = useState<string>('');

  // Derived State: The source of truth for all stats
  const wrestlerStats = useMemo(() => {
    return calculateStats(matches, rosterNames);
  }, [matches, rosterNames]);

  const sortedWrestlers = useMemo(() => {
    return Object.values(wrestlerStats).sort((a: Wrestler, b: Wrestler) => b.reputation - a.reputation);
  }, [wrestlerStats]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('hoyo_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('hoyo_roster', JSON.stringify(rosterNames));
  }, [rosterNames]);

  const handleAddMatch = (matchData: Omit<Match, 'id'>) => {
    const newMatch: Match = {
      ...matchData,
      id: crypto.randomUUID(),
    };
    setMatches([...matches, newMatch]);
    
    // Auto expand the new season/episode
    setExpandedSeasons(prev => ({...prev, [newMatch.season]: true}));
    setExpandedEpisodes(prev => ({...prev, [`${newMatch.season}-${newMatch.episode}`]: true}));
  };

  const handleDeleteMatch = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('¿Estás seguro de eliminar este combate?')) {
      setMatches(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleDeleteSeason = (seasonNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de borrar TODA la Temporada ${seasonNum}? Se eliminarán todos los combates asociados.`)) {
      setMatches(prev => prev.filter(m => m.season !== seasonNum));
    }
  };

  const handleDeleteEpisode = (seasonNum: number, episodeNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de borrar el Episodio ${episodeNum} de la Temporada ${seasonNum}?`)) {
      setMatches(prev => prev.filter(m => !(m.season === seasonNum && m.episode === episodeNum)));
    }
  };

  const handleClearAllData = () => {
    if (confirm("¡PELIGRO! ¿Estás seguro de borrar TODOS los datos de la aplicación? Esta acción no se puede deshacer.")) {
      if (confirm("Confirma nuevamente: ¿Borrar todo?")) {
        setMatches([]);
        setAiAnalysis('');
        setWrestlerBio('');
        alert("Todos los datos han sido eliminados.");
      }
    }
  };

  const handleRandomizeData = () => {
    if (matches.length > 0 && !confirm("Esto borrará los combates actuales para crear una nueva historia aleatoria. ¿Continuar?")) {
      return;
    }

    const newMatches: Match[] = [];
    const seasons = 4;
    const episodesPerSeason = 6;
    const matchesPerEpisode = 5;
    let timestampCounter = Date.now() - (seasons * episodesPerSeason * matchesPerEpisode * 10000);

    for (let s = 1; s <= seasons; s++) {
      for (let e = 1; e <= episodesPerSeason; e++) {
        for (let m = 0; m < matchesPerEpisode; m++) {
          // Randomize wrestlers
          const wrestler1 = rosterNames[Math.floor(Math.random() * rosterNames.length)];
          let wrestler2 = rosterNames[Math.floor(Math.random() * rosterNames.length)];
          while (wrestler2 === wrestler1) {
             wrestler2 = rosterNames[Math.floor(Math.random() * rosterNames.length)];
          }

          const winner = Math.random() > 0.5 ? wrestler1 : wrestler2;
          const loser = winner === wrestler1 ? wrestler2 : wrestler1;
          const isTitle = Math.random() > 0.92; // 8% chance title match

          newMatches.push({
            id: crypto.randomUUID(),
            season: s,
            episode: e,
            show: `Temporada ${s} - Episodio ${e}`,
            winner,
            loser,
            isTitleMatch: isTitle,
            titleName: isTitle ? "Cinturón del Hoyo" : undefined,
            timestamp: timestampCounter++
          });
        }
      }
    }

    setMatches(newMatches);
    // Expand latest season
    setExpandedSeasons({ [seasons]: true });
    alert(`¡Generados ${newMatches.length} combates aleatorios!`);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.matches && data.roster) {
            setMatches(data.matches);
            setRosterNames(data.roster);
            alert('Datos importados correctamente.');
          }
        } catch (err) {
          alert('Error al leer el archivo JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify({ matches, roster: rosterNames }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `el_hoyo_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await generateRosterAnalysis(sortedWrestlers);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const getWrestlerBio = async (wrestler: Wrestler) => {
    setWrestlerBio("Generando...");
    const bio = await generateWrestlerBio(wrestler, customWrestlerInfo);
    setWrestlerBio(bio);
  }

  // --- RENDER VIEWS ---

  const renderRanking = () => (
    <div className="overflow-x-auto">
      <div className="bg-zinc-900 rounded-xl shadow-xl overflow-hidden border border-zinc-800">
        <table className="w-full text-left">
          <thead className="bg-zinc-800 text-zinc-400 font-bold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Luchador</th>
              <th className="p-4 text-center">Reputación</th>
              <th className="p-4 text-center">Record (V-D)</th>
              <th className="p-4 text-center">Racha</th>
              <th className="p-4 text-center">Títulos</th>
              <th className="p-4 text-center">Combates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedWrestlers.map((w, index) => (
              <tr key={w.name} className="hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => { setSelectedWrestlerId(w.name); setActiveTab(AppTab.PROFILE); }}>
                <td className="p-4 font-mono text-zinc-500">#{index + 1}</td>
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  {index === 0 && <Trophy size={16} className="text-hoyo-gold" />}
                  {w.name}
                </td>
                <td className="p-4 text-center font-bold text-hoyo-accent">{w.reputation}</td>
                <td className="p-4 text-center">{w.wins} - {w.losses}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${w.streak > 2 ? 'bg-green-900 text-green-300' : 'bg-zinc-700 text-zinc-400'}`}>
                    {w.streak}
                  </span>
                </td>
                <td className="p-4 text-center text-hoyo-gold">{w.titles > 0 ? '🏆'.repeat(w.titles) : '-'}</td>
                <td className="p-4 text-center text-zinc-500">{w.matches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTimeline = () => {
    // Group matches: Season -> Episode -> Matches[]
    const grouped = matches.reduce((acc, match) => {
      // Default to Season 1 Episode 1 if old data missing fields
      const s = match.season || 1;
      const e = match.episode || 1;
      
      if (!acc[s]) acc[s] = {};
      if (!acc[s][e]) acc[s][e] = [];
      acc[s][e].push(match);
      return acc;
    }, {} as Record<number, Record<number, Match[]>>);

    // Sort seasons descending
    const seasonsDesc = Object.keys(grouped).map(Number).sort((a, b) => b - a);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Línea Temporal de Shows</h2>
          <button 
            onClick={() => setIsMatchModalOpen(true)}
            className="bg-hoyo-accent hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={18} /> Agregar Combate
          </button>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl">
             <Calendar size={48} className="mx-auto text-zinc-700 mb-4"/>
             <p className="text-zinc-500 italic">No hay combates registrados aún.</p>
             <p className="text-zinc-600 text-sm mt-2">Agrega uno manualmente o usa la opción "Aleatorizar" en Datos.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {seasonsDesc.map(seasonNum => {
              const episodes = grouped[seasonNum];
              const episodesDesc = Object.keys(episodes).map(Number).sort((a, b) => b - a);
              const isSeasonExpanded = expandedSeasons[seasonNum];

              return (
                <div key={`season-${seasonNum}`} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
                  {/* Season Header */}
                  <div 
                    onClick={() => setExpandedSeasons(prev => ({...prev, [seasonNum]: !prev[seasonNum]}))}
                    className="p-4 bg-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-700/80 transition select-none group"
                  >
                    <div className="flex items-center gap-3">
                      {isSeasonExpanded ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                      <h3 className="font-bold text-lg text-white">Temporada {seasonNum}</h3>
                      <span className="text-xs bg-black/40 px-2 py-1 rounded text-zinc-400">
                        {episodesDesc.length} Episodios
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSeason(seasonNum, e)}
                      className="text-zinc-500 hover:text-red-500 hover:bg-red-900/20 p-2 rounded transition"
                      title="Borrar Temporada"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  {isSeasonExpanded && (
                    <div className="p-4 space-y-4 bg-zinc-950/50">
                      {episodesDesc.map(epNum => {
                        const epMatches = episodes[epNum];
                        const epKey = `${seasonNum}-${epNum}`;
                        const isEpExpanded = expandedEpisodes[epKey];

                        return (
                          <div key={epKey} className="border border-zinc-800/50 rounded-lg overflow-hidden">
                             {/* Episode Header */}
                            <div 
                              onClick={() => setExpandedEpisodes(prev => ({...prev, [epKey]: !prev[epKey]}))}
                              className="p-3 bg-zinc-900 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition select-none"
                            >
                               <div className="flex items-center gap-2">
                                  {isEpExpanded ? <ChevronDown size={16} className="text-zinc-500"/> : <ChevronRight size={16} className="text-zinc-500"/>}
                                  <span className="font-semibold text-zinc-200">Episodio {epNum}</span>
                                  <span className="text-xs text-zinc-500 ml-2">{epMatches.length} Combates</span>
                               </div>
                               <button 
                                  onClick={(e) => handleDeleteEpisode(seasonNum, epNum, e)}
                                  className="text-zinc-600 hover:text-red-500 p-1 rounded transition"
                                  title="Borrar Episodio"
                                >
                                  <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Matches List */}
                            {isEpExpanded && (
                              <div className="divide-y divide-zinc-800/50 bg-black/20">
                                {epMatches.reverse().map((match) => (
                                  <div key={match.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition group">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-green-400 w-1/3 text-right">{match.winner}</span>
                                        <span className="text-zinc-600 text-xs font-bold px-1">VS</span>
                                        <span className="text-red-400 w-1/3 text-left">{match.loser}</span>
                                      </div>
                                      {match.isTitleMatch && (
                                        <div className="text-center text-[10px] text-hoyo-gold uppercase tracking-wide mt-1">
                                          🏆 {match.titleName || "Título"}
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={(e) => handleDeleteMatch(match.id, e)} 
                                      className="ml-4 p-2 text-zinc-700 hover:text-red-500 hover:bg-red-900/10 rounded transition opacity-0 group-hover:opacity-100"
                                      title="Borrar Combate"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    const wrestler = selectedWrestlerId ? wrestlerStats[selectedWrestlerId] : sortedWrestlers[0];

    if (!wrestler) return <div>Selecciona un luchador</div>;

    const chartData = wrestler.history.map((rep, idx) => ({ match: idx, rep }));

    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-3xl font-black text-white mb-1">{wrestler.name}</h2>
            <div className="text-hoyo-accent font-bold text-lg mb-6">Reputación: {wrestler.reputation}</div>
            
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-zinc-400">Victorias</span>
                <span className="font-bold text-green-400">{wrestler.wins}</span>
              </div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-zinc-400">Derrotas</span>
                <span className="font-bold text-red-400">{wrestler.losses}</span>
              </div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-zinc-400">Racha Actual</span>
                <span className="font-bold text-white">{wrestler.streak}</span>
              </div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-zinc-400">Mejor Racha</span>
                <span className="font-bold text-hoyo-gold">{wrestler.maxStreak}</span>
              </div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded border border-zinc-800">
                <span className="text-zinc-400">Títulos</span>
                <span className="font-bold text-hoyo-gold flex items-center gap-1">
                   {wrestler.titles} <Trophy size={14}/>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                 <BrainCircuit size={18} className="text-purple-400"/>
                 Gemini Insight
               </h3>
             </div>
             
             <div className="mb-4">
               <label className="text-xs text-zinc-500 block mb-1">Contexto adicional (Apariencia/Historia)</label>
               <textarea 
                  value={customWrestlerInfo}
                  onChange={(e) => setCustomWrestlerInfo(e.target.value)}
                  placeholder="Ej. Lleva una máscara de ardilla, es un ex-chef..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-white focus:outline-none focus:border-hoyo-accent resize-none h-16"
               />
             </div>

             <button onClick={() => getWrestlerBio(wrestler)} className="w-full mb-4 bg-purple-900/50 hover:bg-purple-900 text-purple-200 px-3 py-2 rounded text-sm transition font-medium flex justify-center items-center gap-2">
                 <BrainCircuit size={14} /> Generar Biografía
             </button>

             <p className="text-sm text-zinc-400 italic leading-relaxed bg-black/20 p-3 rounded">
               {wrestlerBio || "Solicita un análisis IA para ver la biografía generada."}
             </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 h-80">
            <h3 className="font-bold text-zinc-400 mb-4">Historial de Reputación</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="match" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #333' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="rep" stroke="#e63946" strokeWidth={3} dot={{r: 4, fill:'#e63946'}} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
             <h3 className="font-bold text-zinc-400 mb-4">Seleccionar otro luchador</h3>
             <div className="flex flex-wrap gap-2">
               {sortedWrestlers.map(w => (
                 <button 
                   key={w.name}
                   onClick={() => { setSelectedWrestlerId(w.name); setWrestlerBio(''); setCustomWrestlerInfo(''); }}
                   className={`px-3 py-1 text-sm rounded-full transition ${selectedWrestlerId === w.name ? 'bg-hoyo-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                 >
                   {w.name}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTrivia = () => {
    // Calculate Trivia
    const longestStreak = [...sortedWrestlers].sort((a,b) => b.maxStreak - a.maxStreak)[0];
    const mostMatches = [...sortedWrestlers].sort((a,b) => b.matches - a.matches)[0];
    const mostTitles = [...sortedWrestlers].sort((a,b) => b.titles - a.titles)[0];

    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center gap-4">
            <div className="bg-blue-900/30 p-3 rounded-full text-blue-400">
               <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Racha Histórica más larga</p>
              <p className="text-xl font-bold">{longestStreak?.name} ({longestStreak?.maxStreak})</p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center gap-4">
            <div className="bg-orange-900/30 p-3 rounded-full text-orange-400">
               <Swords size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Más Combates</p>
              <p className="text-xl font-bold">{mostMatches?.name} ({mostMatches?.matches})</p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center gap-4">
            <div className="bg-yellow-900/30 p-3 rounded-full text-yellow-400">
               <Trophy size={24} />
            </div>
            <div>
              <p className="text-zinc-500 text-sm">Más Títulos</p>
              <p className="text-xl font-bold">{mostTitles?.name} ({mostTitles?.titles})</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl p-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
             <BrainCircuit size={120} />
           </div>
           
           <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
             <BrainCircuit className="text-hoyo-accent" />
             Análisis de IA
           </h3>
           <p className="text-zinc-400 mb-6 max-w-2xl">
             Usa Gemini 1.5 para analizar el estado actual de la liga, identificar rivalidades potenciales y comentar sobre el desempeño de los luchadores top.
           </p>

           <div className="mb-6">
              {aiAnalysis ? (
                <div className="bg-zinc-950/50 p-6 rounded-lg border border-zinc-700 whitespace-pre-wrap leading-relaxed text-zinc-200">
                  {aiAnalysis}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg text-zinc-600">
                  El análisis aparecerá aquí...
                </div>
              )}
           </div>

           <button 
             onClick={runAnalysis}
             disabled={isAnalyzing}
             className="bg-white text-black hover:bg-zinc-200 font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
           >
             {isAnalyzing ? (
               <><span className="animate-spin">⏳</span> Analizando...</>
             ) : (
               <><Lightbulb size={20} /> Generar Reporte Inteligente</>
             )}
           </button>
        </div>
      </div>
    );
  };

  const renderData = () => (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Randomize Option */}
      <div className="bg-gradient-to-br from-hoyo-accent/10 to-transparent border border-hoyo-accent/30 rounded-xl p-6 text-center">
        <div className="mx-auto bg-hoyo-accent/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-hoyo-accent">
          <Dices size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-hoyo-accent">Aleatorizar Historia</h3>
        <p className="text-zinc-400 mb-6">
          Genera automáticamente una historia con temporadas, episodios y combates aleatorios para simular una liga activa.
        </p>
        <button onClick={handleRandomizeData} className="bg-hoyo-accent hover:bg-red-700 text-white px-6 py-3 rounded-lg w-full font-bold transition shadow-lg shadow-red-900/20">
          <Dices size={18} className="inline mr-2" />
          Generar Historia Aleatoria
        </button>
      </div>

       <div className="bg-zinc-900 border border-red-900/50 rounded-xl p-6 text-center">
        <div className="mx-auto bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-red-500">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-red-500">Zona de Peligro</h3>
        <p className="text-zinc-500 mb-6">Elimina permanentemente todos los combates, historial y estadísticas.</p>
        <button onClick={handleClearAllData} className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 px-6 py-3 rounded-lg w-full font-medium transition">
          Borrar todos los datos
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <div className="mx-auto bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Download size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">Exportar Datos</h3>
        <p className="text-zinc-500 mb-6">Descarga un archivo JSON con todos los combates y luchadores para tener una copia de seguridad.</p>
        <button onClick={handleExportData} className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg w-full font-medium transition">
          Descargar Backup
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <div className="mx-auto bg-zinc-800 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <Upload size={32} className="text-zinc-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">Importar Datos</h3>
        <p className="text-zinc-500 mb-6">Restaura una copia de seguridad anterior. ¡Cuidado! Esto sobrescribirá los datos actuales.</p>
        <label className="bg-hoyo-accent hover:bg-red-700 text-white px-6 py-3 rounded-lg w-full font-medium transition cursor-pointer block">
          Seleccionar Archivo JSON
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-20 lg:w-64 bg-black border-r border-zinc-900 flex-shrink-0 flex md:flex-col justify-between md:h-screen sticky top-0 z-40">
        <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-zinc-900">
          <div className="w-8 h-8 bg-hoyo-accent rounded flex items-center justify-center font-black text-black">H</div>
          <span className="font-bold text-lg hidden lg:block tracking-tighter">EL HOYO</span>
        </div>

        <div className="flex md:flex-col overflow-x-auto md:overflow-visible w-full">
          {[
            { id: AppTab.RANKING, label: 'Ranking', icon: Users },
            { id: AppTab.TIMELINE, label: 'Línea Temporal', icon: Calendar },
            { id: AppTab.PROFILE, label: 'Perfil', icon: BarChart3 },
            { id: AppTab.TRIVIA, label: 'Curiosidades', icon: Lightbulb },
            { id: AppTab.DATA, label: 'Datos', icon: Database },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 p-4 md:px-6 md:py-4 transition-all whitespace-nowrap ${activeTab === item.id ? 'bg-zinc-900 text-hoyo-accent border-r-2 border-hoyo-accent' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}
            >
              <item.icon size={20} />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 hidden md:block mt-auto border-t border-zinc-900">
          <div className="text-xs text-zinc-600 text-center">v1.2.0</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">
              {activeTab === AppTab.RANKING && "Tabla Mundial"}
              {activeTab === AppTab.TIMELINE && "Historial de Shows"}
              {activeTab === AppTab.PROFILE && "Perfil de Luchador"}
              {activeTab === AppTab.TRIVIA && "Curiosidades y Análisis"}
              {activeTab === AppTab.DATA && "Gestión de Datos"}
            </h1>
            <p className="text-zinc-500 mt-1">El Hoyo Wrestling Statistics Manager</p>
          </div>
          {activeTab === AppTab.TIMELINE && (
            <button onClick={() => setIsMatchModalOpen(true)} className="md:hidden bg-hoyo-accent p-2 rounded text-white">
              <Plus size={24} />
            </button>
          )}
        </header>

        <div className="animate-in fade-in duration-300">
          {activeTab === AppTab.RANKING && renderRanking()}
          {activeTab === AppTab.TIMELINE && renderTimeline()}
          {activeTab === AppTab.PROFILE && renderProfile()}
          {activeTab === AppTab.TRIVIA && renderTrivia()}
          {activeTab === AppTab.DATA && renderData()}
        </div>
      </main>

      {/* Modal */}
      <MatchModal 
        isOpen={isMatchModalOpen} 
        onClose={() => setIsMatchModalOpen(false)} 
        onSubmit={handleAddMatch}
        wrestlerNames={rosterNames} 
      />
    </div>
  );
}
