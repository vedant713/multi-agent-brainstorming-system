"use client";

import { useState } from "react";

interface AgentBuilderProps {
    onClose: () => void;
    onCreated: () => void;
}

export default function AgentBuilder({ onClose, onCreated }: AgentBuilderProps) {
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agents`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, role, prompt }),
            });

            if (!res.ok) {
                throw new Error("Failed to create agent");
            }

            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Create Custom Agent</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Agent Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. The Pirate"
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Role/Persona</label>
                        <input
                            type="text"
                            required
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Captain Blackbeard"
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">System Prompt</label>
                        <p className="text-xs text-gray-500 mb-2">Define how this agent thinks and behaves.</p>
                        <textarea
                            required
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="You are a ruthless pirate captain. Evaluate ideas based on how much gold they will bring..."
                            rows={4}
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-gray-400 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Agent"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
