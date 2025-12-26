from typing import List, Dict, Any
import google.generativeai as genai
from sklearn.cluster import AgglomerativeClustering
import numpy as np
import json
import ollama
from services.database import DatabaseService
from services.llm import LLMService

class ClusteringService:
    def __init__(self, db_service: DatabaseService, llm_service: LLMService):
        self.db_service = db_service
        self.llm_service = llm_service
        # Model loading removed (using API)

    async def cluster_responses(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Fetches responses for a session, generates embeddings, clusters them,
        and generates semantic names using the LLM.
        """
        if not self.db_service.get_client():
            print("No DB connection")
            return []

        # 1. Fetch responses
        response = self.db_service.get_client().table("responses").select("*").eq("session_id", session_id).execute()
        responses = response.data
        
        if not responses:
            return []

        texts = [r['content'] for r in responses]
        ids = [r['id'] for r in responses]

        # 2. Generate embeddings
        # Use Gemini API for embeddings
        try:
            result = genai.embed_content(
                model="models/embedding-001",
                content=texts,
                task_type="clustering",
            )
            embeddings = [e['embedding'] for e in result['embedding']] if 'embedding' in result else []
            # Check if result structure is correct, sometimes it returns a list directly if not batched? 
            # Actually for list input, it returns dict with 'embedding' as a list of embeddings.
            
            if not embeddings:
                 print("No embeddings returned")
                 return []
                 
            embeddings = np.array(embeddings)
            
        except Exception as e:
            print(f"Error generating embeddings with Gemini: {e}")
            
            # Fallback to Ollama
            try:
                print("Falling back to Ollama for embeddings...")
                embeddings = []
                # Attempt to find a suitable embedding model
                model_to_use = "gemma3:27b" # Default known model
                try:
                    list_res = ollama.list()
                    # list_res['models'] is a list of dict objects
                    available_names = [m['model'] for m in list_res['models']]
                    
                    # Preference order for embeddings
                    if any("nomic-embed-text" in name for name in available_names):
                        model_to_use = "nomic-embed-text"
                    elif any("all-minilm" in name for name in available_names):
                        model_to_use = "all-minilm"
                except Exception as list_e:
                    print(f"Failed to list Ollama models, defaulting to {model_to_use}: {list_e}")

                print(f"Using local model: {model_to_use}")
                for text in texts:
                    res = ollama.embeddings(model=model_to_use, prompt=text)
                    if 'embedding' in res:
                        embeddings.append(res['embedding'])
                
                embeddings = np.array(embeddings)

            except Exception as ollama_e:
                print(f"Ollama Embedding Error: {ollama_e}")
                print("Falling back to Mock Clustering...")
                embeddings = []


        # 3. Cluster
        if not len(embeddings):
            # Mock Clustering: Assign random clusters if no embeddings
            if len(texts) > 0:
                import random
                # Create 3-5 random clusters depending on text count
                n_mock_clusters = min(len(texts), random.randint(3, 5))
                cluster_assignment = [random.randint(0, n_mock_clusters - 1) for _ in texts]
            else:
                 cluster_assignment = []
        elif len(embeddings) < 2:
            cluster_assignment = np.zeros(len(embeddings), dtype=int)
        else:
            clustering_model = AgglomerativeClustering(n_clusters=None, distance_threshold=1.5) 
            cluster_assignment = clustering_model.fit_predict(embeddings)

        # Group by cluster ID
        clusters_map: Dict[int, List[str]] = {}
        cluster_texts: Dict[int, List[str]] = {}
        
        for idx, cluster_id in enumerate(cluster_assignment):
            if cluster_id not in clusters_map:
                clusters_map[cluster_id] = []
                cluster_texts[cluster_id] = []
            clusters_map[cluster_id].append(ids[idx])
            cluster_texts[cluster_id].append(texts[idx])

        final_clusters = []

        # 4. Save clusters and assignments with AI Naming
        for cluster_id, response_ids in clusters_map.items():
            content_sample = "\n---\n".join(cluster_texts[cluster_id][:5]) # Limit sample size
            
            # Generate Name & Description & Metadata
            prompt = f"""
            Analyze these brainstorming ideas and provide a JSON output with the following fields:
            1. "name": A short, punchy title (max 5 words).
            2. "description": A brief summary (max 1 sentence).
            3. "decision_relevance": "High", "Medium", or "Low".
            4. "consensus_status": "Consensus", "Disputed", or "Mixed".
            5. "risks": A list of potential risks [string].
            6. "opportunities": A list of key opportunities [string].
            
            Ideas:
            {content_sample}
            
            Output JSON only.
            """
            
            name = f"Group {cluster_id + 1}"
            description = "AI generated cluster"
            decision_relevance = "Medium"
            consensus_status = "Mixed"
            risks = []
            opportunities = []
            
            try:
                ai_response = await self.llm_service.generate_response(prompt)
                # Clean markdown code blocks if present
                clean_response = ai_response.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_response)
                name = data.get("name", name)
                description = data.get("description", description)
                decision_relevance = data.get("decision_relevance", decision_relevance)
                consensus_status = data.get("consensus_status", consensus_status)
                risks = data.get("risks", risks)
                opportunities = data.get("opportunities", opportunities)

            except Exception as e:
                print(f"Error generating cluster metadata: {e}")
                # Fallback names
                name = f"Cluster {cluster_id + 1}"
                description = f"Group of {len(response_ids)} related ideas."

            # Create cluster record
            cluster_res = self.db_service.get_client().table("clusters").insert({
                "session_id": session_id,
                "name": name,
                "description": description,
                "decision_relevance": decision_relevance,
                "consensus_status": consensus_status,
                "risks": risks,
                "opportunities": opportunities
            }).execute()
            
            cluster_db_id = cluster_res.data[0]['id']

            # Create assignments
            assignments = [{"response_id": rid, "cluster_id": cluster_db_id} for rid in response_ids]
            self.db_service.get_client().table("cluster_assignments").insert(assignments).execute()
            
            final_clusters.append({
                "id": cluster_db_id,
                "name": name,
                "description": description,
                "decision_relevance": decision_relevance,
                "consensus_status": consensus_status,
                "risks": risks,
                "opportunities": opportunities,
                "response_ids": response_ids
            })
            
        return final_clusters
