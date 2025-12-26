"use client";

import { useState, useEffect } from "react";

interface QualityPanelProps {
    sessionId: string;
}

interface QualityData {
    scores: {
        depth: number;
        balance: number;
        evidence: number;
        stakeholder_inclusion: number;
        actionability: number;
    };
    feedback: {
        strengths: string[];
        gaps: string[];
        improvements: string[];
    };
}

export default function QualityPanel({ sessionId }: QualityPanelProps) {
    const [data, setData] = useState<QualityData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/brainstorm/${sessionId}/quality`);
            if (res.ok) {
                const json = await res.json();
                if (json.latest) {
                    setData(json.latest);
                }
            }
        } catch (e) {
            console.error("Failed to fetch quality data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [sessionId]);

    if (loading && !data) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading Quality Metrics...</div>;

    if (!data) return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border border-white/5 rounded-3xl bg-white/5 backdrop-blur-sm border-dashed">
            <h3 className="text-2xl font-bold text-gray-300 mb-2">No Quality Data Yet</h3>
            <p className="text-gray-500 max-w-md">The Moderator Agent is analyzing the debate. Scores will appear here after the first intervention.</p>
        </div>
    );

    const renderScore = (label: string, value: number, color: string) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-white">{label}</span>
                <span className={`text-sm font-bold opacity-80`} style={{ color }}>{value}/10</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all duration-1000" style={{ width: `${value * 10}%`, backgroundColor: color }}></div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-fade-in space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-4">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight mb-2">
                    Debate Quality Report
                </h2>
                <p className="text-gray-400 font-light text-sm">Real-time assessment by the Moderator Agent</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scores Panel */}
                <div className="p-6 border border-white/10 rounded-2xl bg-black/20 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        Quality Scores
                    </h3>
                    {renderScore("Detail & Depth", data.scores.depth, "#60a5fa")}
                    {renderScore("Perspective Balance", data.scores.balance, "#a78bfa")}
                    {renderScore("Evidence Usage", data.scores.evidence, "#f59e0b")}
                    {renderScore("Stakeholder Inclusion", data.scores.stakeholder_inclusion, "#34d399")}
                    {renderScore("Actionability", data.scores.actionability, "#f472b6")}
                </div>

                {/* Feedback Panel */}
                <div className="space-y-6">
                    <div className="p-5 border border-green-500/20 rounded-2xl bg-green-500/5">
                        <h4 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Key Strengths
                        </h4>
                        <ul className="space-y-2">
                            {data.feedback.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="p-5 border border-red-500/20 rounded-2xl bg-red-500/5">
                        <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Identified Gaps
                        </h4>
                        <ul className="space-y-2">
                            {data.feedback.gaps.map((s, i) => (
                                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 flex-shrink-0"></span>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="p-6 border border-amber-500/20 rounded-2xl bg-amber-500/5 mt-6">
                <h4 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Actionable Improvements
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.feedback.improvements.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/10">
                            <span className="font-bold text-amber-500 text-lg">#{i + 1}</span>
                            <p className="text-sm text-gray-300 font-medium pt-0.5">{s}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
