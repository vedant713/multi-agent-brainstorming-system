"use client";

import { useState } from "react";
import MindMap from "./MindMap";

interface ClusterViewProps {
    sessionId: string;
    topic?: string;
}

interface Cluster {
    id: string;
    name: string;
    description: string;
    response_ids: string[];
}

export default function ClusterView({ sessionId, topic }: ClusterViewProps) {
    const [clusters, setClusters] = useState<Cluster[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

    const handleCluster = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/brainstorm/${sessionId}/cluster`, {
                method: "POST",
            });
            const data = await res.json();
            setClusters(data.clusters);
        } catch (error) {
            console.error("Clustering failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-8 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                <div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                        Clustered Ideas
                    </h2>
                    <p className="text-gray-400 mt-1 font-light tracking-wide">AI-generated groupings of your brainstorming session</p>
                </div>

                <div className="flex gap-4">
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 self-center h-fit">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            title="List View"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('graph')}
                            className={`px-3 py-2 rounded-md transition-all ${viewMode === 'graph' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                            title="Graph View"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                        </button>
                    </div>

                    <button
                        onClick={handleCluster}
                        disabled={loading}
                        className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-white/10 ${loading
                            ? "bg-gray-800 cursor-not-allowed text-gray-500"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-3">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing Analysis...
                            </span>
                        ) : "Generate Clusters"}
                    </button>
                </div>
            </div>

            {clusters ? (
                viewMode === 'graph' ? (
                    <MindMap clusters={clusters} topic={topic} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-4 pr-2">
                        {clusters.map((cluster, idx) => (
                            <div
                                key={cluster.id}
                                className="group p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 backdrop-blur-md shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-500/30"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="flex flex-col items-start mb-6">
                                    <div className="flex items-center justify-between w-full mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 transition-colors">
                                                <span className="font-bold text-lg text-blue-400">#{idx + 1}</span>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-blue-500/10 text-blue-300 text-xs font-bold rounded-full border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                            {cluster.response_ids.length} items
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-xl text-gray-200 group-hover:text-white transition-colors leading-tight mb-2">
                                        {cluster.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-light leading-relaxed">
                                        {cluster.description}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {cluster.response_ids.map((id, i) => (
                                        <div key={id} className="flex items-start gap-3 text-sm text-gray-400 p-3 rounded-xl bg-black/20 hover:bg-black/40 transition-all duration-300 border border-transparent hover:border-white/5">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 shadow-[0_0_5px_rgba(96,165,250,0.5)]"></span>
                                            <span className="font-light tracking-wide leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                                                Response ID: <span className="font-mono text-xs text-blue-300/70">{id.substring(0, 8)}...</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/5 backdrop-blur-sm border-dashed">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6 animate-pulse">
                        <span className="text-4xl">📊</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-2">Ready to Analyze</h3>
                    <p className="text-gray-500 max-w-md">
                        Once the brainstorming session has generated enough ideas, click "Generate Clusters" to group them by semantic similarity.
                    </p>
                </div>
            )}
        </div>
    );
}
