"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/components/ChatInterface";
import ClusterView from "@/components/ClusterView";
import QualityPanel from "@/components/QualityPanel";
import AgentBuilder from "@/components/AgentBuilder";

interface Agent {
  id: string;
  name: string;
  role: string;
}

const DEFAULT_AGENTS = [
  { id: 'optimist', name: 'Optimist', role: 'Optimist' },
  { id: 'skeptic', name: 'Skeptic', role: 'Skeptic' },
  { id: 'analyst', name: 'Analyst', role: 'Analyst' },
  { id: 'evaluator', name: 'Evaluator', role: 'Evaluator' },
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'discussion' | 'analysis' | 'report'>('discussion');
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(DEFAULT_AGENTS.map(a => a.id));
  const [assuranceMode, setAssuranceMode] = useState<'insight' | 'evidence'>('insight');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agents`);
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data.agents || []);
      }
    } catch (e) {
      console.error("Failed to fetch agents", e);
    }
  };

  const deleteAgent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agents/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAvailableAgents(prev => prev.filter(a => a.id !== id));
        setSelectedAgentIds(prev => prev.filter(pid => pid !== id));
      }
    } catch (error) {
      console.error("Failed to delete agent", error);
    }
  };

  const handleAgentCreated = () => {
    fetchAgents();
  };

  const toggleAgent = (id: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const startSession = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("topic", topic);
      if (file) {
        formData.append("file", file);
      }
      if (selectedAgentIds.length > 0) {
        formData.append("agent_ids", selectedAgentIds.join(","));
      }
      formData.append("assurance_mode", assuranceMode);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/brainstorm`, {
        method: "POST",
        body: formData, // No Content-Type header needed for FormData
      });
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 overflow-hidden relative font-sans">
      {/* Cinematic Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse delay-700" />
        <div className="absolute top-[20%] left-[40%] w-[30%] h-[30%] rounded-full bg-fuchsia-600/10 blur-[100px] animate-pulse delay-1500" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 h-screen flex flex-col">
        <header className="flex justify-between items-center mb-12 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="font-bold text-xl">B</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Brainstorm AI</h1>
          </div>
          <div className="text-sm font-medium text-gray-400 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-md">
            v2.0 Hyper-Stream
          </div>
        </header>

        {!sessionId ? (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in-up -mt-20">
            <div className="text-center mb-12 space-y-6 max-w-4xl">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500 drop-shadow-2xl">
                Orchestrate Your <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">Next Big Idea</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
                Deploy a squad of specialized AI agents to analyze, critique, and refine your concepts in real-time.
              </p>
            </div>

            <div className="w-full max-w-3xl relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 p-2 flex items-center gap-2 shadow-2xl">
                <label className="p-4 cursor-pointer hover:bg-white/10 rounded-xl transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept="image/*,application/pdf"
                  />
                  <svg className={`w-6 h-6 ${file ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
                  </svg>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Describe your challenge..."
                  className="flex-1 bg-transparent p-6 text-2xl font-medium placeholder-gray-600 text-white outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && startSession()}
                />
                <button
                  onClick={startSession}
                  disabled={loading || !topic}
                  className="px-8 py-6 bg-white text-black rounded-xl font-bold text-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <span>Start</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </>
                  )}
                </button>
              </div>

              {/* Evidence Mode Toggle */}
              <div className="flex gap-4 mb-4 justify-center">
                <button
                  onClick={() => setAssuranceMode('insight')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${assuranceMode === 'insight' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-transparent border-white/10 text-gray-500 hover:text-white'}`}
                >
                  ⚡ Insight Mode (Fast)
                </button>
                <button
                  onClick={() => setAssuranceMode('evidence')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${assuranceMode === 'evidence' ? 'bg-amber-600/20 border-amber-500 text-amber-300' : 'bg-transparent border-white/10 text-gray-500 hover:text-white'}`}
                >
                  ⚖️ Evidence Mode (Rigorous)
                </button>
              </div>
            </div>

            {/* Agent Selection Section */}
            <div className="mt-12 w-full max-w-4xl">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Assemble Your Squad</h3>
                  <p className="text-gray-400 text-sm">Default agents are included by default but can be removed. Click to toggle.</p>
                </div>
                <button
                  onClick={() => setShowAgentBuilder(true)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  Create Agent
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Default Agents Display (Now Selectable) */}
                {DEFAULT_AGENTS.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${selectedAgentIds.includes(agent.id)
                      ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                      : 'bg-white/5 border-white/10 hover:border-white/30 opacity-60'
                      }`}
                  >
                    {selectedAgentIds.includes(agent.id) && (
                      <div className="absolute top-2 right-2 text-blue-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                      </div>
                    )}
                    <h4 className="font-bold text-white mb-1">{agent.name}</h4>
                    <span className="text-xs text-blue-400 uppercase tracking-wider font-bold">Core Team</span>
                  </div>
                ))}

                {/* Custom Agents */}
                {availableAgents.map(agent => (
                  <div
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden group ${selectedAgentIds.includes(agent.id)
                      ? 'bg-purple-600/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                      : 'bg-white/5 border-white/10 hover:border-white/30 opacity-80'
                      }`}
                  >
                    {selectedAgentIds.includes(agent.id) && (
                      <div className="absolute top-2 right-2 text-purple-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                      </div>
                    )}

                    <button
                      onClick={(e) => deleteAgent(agent.id, e)}
                      className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-1"
                      title="Delete Agent"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>

                    <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors mb-1">{agent.name}</h4>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">{agent.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20 flex gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['Optimist', 'Skeptic', 'Analyst', 'Evaluator'].map((role) => (
                <div key={role} className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-sm font-medium">{role}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 animate-fade-in-up">
            {/* Session Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-2 pr-6 rounded-full border border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Current Topic</span>
                  <span className="font-bold text-white truncate max-w-xs md:max-w-md">{topic}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl p-1.5 rounded-full border border-white/10">
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'discussion'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Discussion
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'analysis'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Analysis
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeTab === 'report'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Quality
                </button>
              </div>

              <button
                onClick={() => { setSessionId(null); setTopic(""); setActiveTab('discussion'); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                title="End Session"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 relative">
              <div className={`absolute inset-0 transition-all duration-500 transform ${activeTab === 'discussion' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 -translate-x-10 z-0 pointer-events-none'}`}>
                <ChatInterface sessionId={sessionId} topic={topic} agentIds={selectedAgentIds} assuranceMode={assuranceMode} />
              </div>
              <div className={`absolute inset-0 transition-all duration-500 transform ${activeTab === 'analysis' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-10 z-0 pointer-events-none'}`}>
                <ClusterView sessionId={sessionId} topic={topic} />
              </div>
              <div className={`absolute inset-0 transition-all duration-500 transform ${activeTab === 'report' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-10 z-0 pointer-events-none'}`}>
                <QualityPanel sessionId={sessionId} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showAgentBuilder && (
        <AgentBuilder onClose={() => setShowAgentBuilder(false)} onCreated={handleAgentCreated} />
      )}
    </main>
  );
}
