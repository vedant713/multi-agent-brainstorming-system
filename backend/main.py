from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
import os

load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm import LLMService
from services.database import DatabaseService
from services.orchestrator import Orchestrator
from services.clustering import ClusteringService
import uuid

app = FastAPI(title="Multi-Agent Brainstorming System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
# In a real app, use dependency injection
db_service = DatabaseService()
llm_service = LLMService()
orchestrator = Orchestrator(llm_service, db_service)
clustering_service = ClusteringService(db_service, llm_service)

class BrainstormRequest(BaseModel):
    topic: str

@app.post("/brainstorm")
async def start_brainstorm(request: BrainstormRequest):
    session_id = str(uuid.uuid4())
    # Create session in DB
    if db_service.get_client():
        db_service.get_client().table("sessions").insert({
            "id": session_id,
            "topic": request.topic
        }).execute()
    return {"session_id": session_id}

@app.get("/brainstorm/{session_id}/stream")
async def stream_brainstorm(session_id: str, topic: str = "Unknown Topic"):
    # Retrieve topic from DB if not provided or if we want to double check
    # But prioritizing query param for robustness if DB is down
    db_topic = None
    if db_service.get_client():
        try:
            res = db_service.get_client().table("sessions").select("topic").eq("id", session_id).execute()
            if res.data:
                db_topic = res.data[0]['topic']
        except Exception as e:
            print(f"DB Error fetching topic: {e}")
    
    # Use DB topic if available, otherwise use query param
    final_topic = db_topic if db_topic else topic
    
    return StreamingResponse(
        orchestrator.run_brainstorming_session(final_topic, session_id),
        media_type="text/event-stream"
    )
    
    return StreamingResponse(
        orchestrator.run_brainstorming_session(topic, session_id),
        media_type="text/event-stream"
    )

@app.post("/brainstorm/{session_id}/cluster")
async def cluster_ideas(session_id: str):
    clusters = await clustering_service.cluster_responses(session_id)
    return {"clusters": clusters}

@app.get("/")
async def root():
    return {"message": "Multi-Agent Brainstorming System Backend is running"}
