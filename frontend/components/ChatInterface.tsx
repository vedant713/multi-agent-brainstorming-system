"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    sessionId: string;
    topic: string;
    agentIds?: string[];
    assuranceMode?: 'insight' | 'evidence';
}

interface Message {
    agent: string;
    content: string;
}

export default function ChatInterface({ sessionId, topic, agentIds, assuranceMode = 'insight' }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentAgent, setCurrentAgent] = useState<string | null>(null);
    const [currentContent, setCurrentContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef("");

    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!sessionId || isPaused) return;

        console.log("Connecting to EventSource...");
        console.log("Connecting to EventSource...");
        const encodedTopic = encodeURIComponent(topic);
        const agentIdsParam = agentIds && agentIds.length > 0 ? `&agent_ids=${agentIds.join(',')}` : '';
        const assuranceParam = `&assurance_mode=${assuranceMode}`;
        const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/brainstorm/${sessionId}/stream?topic=${encodedTopic}${agentIdsParam}${assuranceParam}`);

        eventSource.addEventListener("agent_start", (event) => {
            try {
                const data = JSON.parse(event.data);
                setCurrentAgent(data.name);
                contentRef.current = "";
                setCurrentContent("");
            } catch (e) {
                console.error("Error parsing agent_start:", e);
            }
        });

        eventSource.addEventListener("token", (event) => {
            try {
                const data = JSON.parse(event.data);
                contentRef.current += data.text;
                setCurrentContent(contentRef.current);
            } catch (e) {
                console.error("Error parsing token:", e);
            }
        });

        eventSource.addEventListener("agent_end", (event) => {
            try {
                const data = JSON.parse(event.data);
                const finalContent = contentRef.current; // Capture content immediately
                console.log("Agent End:", data.name, "Final Content Length:", finalContent.length);

                if (finalContent) {
                    setMessages((prev) => {
                        // Avoid duplicates if replaying
                        const exists = prev.some(m => m.agent === data.name && m.content === finalContent);
                        if (exists) return prev;
                        return [...prev, { agent: data.name, content: finalContent }];
                    });
                }
                setCurrentAgent(null);
                contentRef.current = "";
                setCurrentContent("");
            } catch (e) {
                console.error("Error parsing agent_end:", e);
            }
        });

        eventSource.onerror = (err) => {
            console.error("EventSource failed:", err);
            eventSource.close();
        };

        return () => {
            console.log("Closing EventSource...");
            eventSource.close();
        };
    }, [sessionId, isPaused]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, currentContent]);

    const getAgentStyles = (agent: string) => {
        switch (agent) {
            case 'Optimist': return {
                container: 'bg-green-500/5 border-green-500/10 text-green-50 shadow-[0_0_30px_rgba(34,197,94,0.05)]',
                avatar: 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400'
            };
            case 'Skeptic': return {
                container: 'bg-red-500/5 border-red-500/10 text-red-50 shadow-[0_0_30px_rgba(239,68,68,0.05)]',
                avatar: 'bg-gradient-to-br from-red-400 to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-400'
            };
            case 'Analyst': return {
                container: 'bg-blue-500/5 border-blue-500/10 text-blue-50 shadow-[0_0_30px_rgba(59,130,246,0.05)]',
                avatar: 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400'
            };
            case 'Evaluator': return {
                container: 'bg-purple-500/5 border-purple-500/10 text-purple-50 shadow-[0_0_30px_rgba(168,85,247,0.05)]',
                avatar: 'bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400'
            };
            case 'Moderator': return {
                container: 'bg-white/10 border-white/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]',
                avatar: 'bg-gradient-to-br from-gray-200 to-gray-400 text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]',
                name: 'text-white'
            };
            default: return {
                container: 'bg-white/5 border-white/10 text-gray-100',
                avatar: 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white',
                name: 'text-gray-400'
            };
        }
    };

    return (
        <div className="flex flex-col h-full border border-white/10 rounded-3xl p-6 bg-black/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden ring-1 ring-white/5">
            {/* Control Buttons */}
            <div className="absolute top-6 right-6 z-20 flex gap-3">
                <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md border ${isPaused
                        ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {isPaused ? (
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Resume
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Pause
                        </span>
                    )}
                </button>

                <button
                    onClick={() => window.location.href = "/"}
                    className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md border bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        End
                    </span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 -mr-2 space-y-8">
                {messages.map((msg, idx) => {
                    const styles = getAgentStyles(msg.agent);
                    return (
                        <div key={idx} className={`relative group animate-fade-in-up`}>
                            <div className={`absolute -inset-2 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${msg.agent === 'Optimist' ? 'from-green-500/10 to-transparent' : msg.agent === 'Skeptic' ? 'from-red-500/10 to-transparent' : msg.agent === 'Analyst' ? 'from-blue-500/10 to-transparent' : 'from-purple-500/10 to-transparent'}`} />
                            <div className={`relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-500 ${styles.container}`}>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${styles.avatar}`}>
                                        {msg.agent[0]}
                                    </div>
                                    <div className={`font-black text-sm tracking-widest uppercase ${styles.name}`}>{msg.agent}</div>
                                </div>
                                <div className="text-[1.1rem] leading-relaxed pl-[4rem] opacity-90 font-light tracking-wide text-gray-100 prose prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {currentAgent && (
                    <div className="relative animate-pulse">
                        <div className={`p-6 rounded-2xl border ${getAgentStyles(currentAgent).container}`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${getAgentStyles(currentAgent).avatar}`}>
                                    {currentAgent[0]}
                                </div>
                                <div className={`font-black text-sm tracking-widest uppercase ${getAgentStyles(currentAgent).name}`}>{currentAgent}</div>
                            </div>
                            <div className="text-[1.1rem] leading-relaxed pl-[4rem] opacity-90 font-light tracking-wide text-gray-100 prose prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentContent}</ReactMarkdown>
                                <span className="inline-block w-2 h-5 ml-1 bg-white opacity-70 animate-blink align-middle shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}
