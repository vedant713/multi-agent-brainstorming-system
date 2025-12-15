from typing import List, Dict, Any
import google.generativeai as genai
from sklearn.cluster import AgglomerativeClustering
import numpy as np
import json
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
            return []

        # 3. Cluster
        # Simple clustering based on similarity
        # If very few items, just put them in one cluster
        if len(embeddings) < 2:
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
            
            # Generate Name & Description
            prompt = f"""
            Analyze these brainstorming ideas and provide a JSON output with two fields:
            1. "name": A short, punchy title (max 5 words) for this group of ideas.
            2. "description": A brief summary (max 1 sentence) of the common theme.
            
            Ideas:
            {content_sample}
            
            Output JSON only.
            """
            
            name = f"Group {cluster_id + 1}"
            description = "AI generated cluster"
            
            try:
                ai_response = await self.llm_service.generate_response(prompt)
                # Clean markdown code blocks if present
                clean_response = ai_response.replace("```json", "").replace("```", "").strip()
                data = json.loads(clean_response)
                name = data.get("name", name)
                description = data.get("description", description)
            except Exception as e:
                print(f"Error generating cluster name: {e}")

            # Create cluster record
            cluster_res = self.db_service.get_client().table("clusters").insert({
                "session_id": session_id,
                "name": name,
                "description": description
            }).execute()
            
            cluster_db_id = cluster_res.data[0]['id']

            # Create assignments
            assignments = [{"response_id": rid, "cluster_id": cluster_db_id} for rid in response_ids]
            self.db_service.get_client().table("cluster_assignments").insert(assignments).execute()
            
            final_clusters.append({
                "id": cluster_db_id,
                "name": name,
                "description": description,
                "response_ids": response_ids
            })
            
        return final_clusters
