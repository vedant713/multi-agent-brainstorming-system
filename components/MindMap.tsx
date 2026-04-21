"use client";

import { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, BackgroundVariant } from 'reactflow';
import 'reactflow/dist/style.css';

interface Cluster {
    id: string;
    name: string;
    description: string;
    response_ids: string[];
}

interface MindMapProps {
    clusters: Cluster[];
    topic?: string;
}

export default function MindMap({ clusters, topic = "Core Topic" }: MindMapProps) {
    const { nodes, edges } = useMemo(() => {
        const initialNodes: Node[] = [];
        const initialEdges: Edge[] = [];

        // Central Node
        initialNodes.push({
            id: 'root',
            type: 'input',
            data: { label: topic },
            position: { x: 400, y: 300 },
            style: {
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                width: 200,
                textAlign: 'center',
            }
        });

        // Cluster Nodes (Circular Layout)
        const radius = 300;
        const totalClusters = clusters.length;

        clusters.forEach((cluster, i) => {
            const angle = (i / totalClusters) * 2 * Math.PI;
            const x = 400 + radius * Math.cos(angle);
            const y = 300 + radius * Math.sin(angle);

            initialNodes.push({
                id: cluster.id,
                data: { label: cluster.name },
                position: { x, y },
                style: {
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    color: '#e0e7ff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    width: 180,
                    fontSize: '14px',
                }
            });

            initialEdges.push({
                id: `e-root-${cluster.id}`,
                source: 'root',
                target: cluster.id,
                animated: true,
                style: { stroke: 'rgba(255, 255, 255, 0.3)' },
            });
        });

        return { nodes: initialNodes, edges: initialEdges };
    }, [clusters, topic]);

    return (
        <div className="w-full h-full min-h-[500px] border border-white/10 rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm">
            <ReactFlow
                defaultNodes={nodes}
                defaultEdges={edges}
                fitView
                className="bg-transparent"
                minZoom={0.5}
                maxZoom={2}
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="rgba(255, 255, 255, 0.1)" />
                <Controls className="bg-white/10 border border-white/10 text-black fill-white" />
            </ReactFlow>
        </div>
    );
}
