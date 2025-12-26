from __future__ import annotations
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Body
from dotenv import load_dotenv
import os
from io import BytesIO
import pypdf
import google.generativeai as genai
import tempfile
import pathlib

# Point to .env in parent directory
env_path = pathlib.Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

print(f"DEBUG: Loaded .env from {env_path}")
print(f"DEBUG: SUPABASE_URL present: {bool(os.getenv('SUPABASE_URL'))}")
print(f"DEBUG: SUPABASE_KEY present: {bool(os.getenv('SUPABASE_KEY'))}")

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



@app.post("/brainstorm")
async def start_brainstorm(
    topic: str = Form(...),
    file: UploadFile | None = File(None),
    agent_ids: str | None = Form(None) # Comma separated IDs
):
    session_id = str(uuid.uuid4())
    
    context_text = ""
    if file:
        try:
            # Save uploaded file to temp file
            suffix = pathlib.Path(file.filename).suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name

            try:
                # Upload to Gemini
                print(f"DEBUG: Uploading {file.filename} to Gemini...")
                uploaded_file = genai.upload_file(tmp_path, mime_type=file.content_type)
                
                # Generate content (OCR/Description)
                # Using 2.0 Flash Exp as requested (user said 2.5, likely meant 2.0-exp)
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                prompt = "Extract all text from this document. If it is an image or scanned PDF, perform OCR. Also describe any diagrams or visual elements found."
                print("DEBUG: Generating content description...")
                response = await model.generate_content_async([prompt, uploaded_file])
                
                context_text = f"\n\n[Attached File Analysis]:\n{response.text}"
                print(f"DEBUG: Successfully processed file. extracted {len(context_text)} chars.")
                
            except Exception as e:
                print(f"Error processing file with Gemini: {e}")
                context_text = f"\n\n[Attached File Error]: Could not process file. Error: {str(e)}"
            finally:
                # Cleanup temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
                    
        except Exception as e:
            print(f"Error handling file upload: {e}")

    full_topic = f"{topic}{context_text}"
    print(f"DEBUG: Session {session_id} - Full Topic Length: {len(full_topic)}")

    # Create session in DB
    if db_service.get_client():
        db_service.get_client().table("sessions").insert({
            "id": session_id,
            "topic": full_topic # Store the combined topic + file context
        }).execute()
        print(f"DEBUG: Session {session_id} - Saved to DB")
    return {"session_id": session_id}

class CreateAgentRequest(BaseModel):
    name: str
    role: str
    prompt: str

@app.post("/agents")
async def create_agent(agent: CreateAgentRequest):
    if db_service.get_client():
        try:
            res = db_service.get_client().table("custom_agents").insert({
                "name": agent.name,
                "role": agent.role,
                "prompt": agent.prompt
            }).execute()
            return {"message": "Agent created", "data": res.data}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=503, detail="Database not available")

@app.get("/agents")
async def get_agents():
    if db_service.get_client():
        try:
            res = db_service.get_client().table("custom_agents").select("*").execute()
            return {"agents": res.data}
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))
    return {"agents": []}

@app.get("/brainstorm/{session_id}/stream")
async def stream_brainstorm(session_id: str, topic: str = "Unknown Topic", agent_ids: str = None):
    # Retrieve topic from DB if not provided or if we want to double check
    # But prioritizing query param for robustness if DB is down
    db_topic = None
    if db_service.get_client():
        try:
            res = db_service.get_client().table("sessions").select("topic").eq("id", session_id).execute()
            if res.data:
                db_topic = res.data[0]['topic']
                print(f"DEBUG: Stream {session_id} - Fetched DB Topic Length: {len(db_topic)}")
        except Exception as e:
            print(f"DB Error fetching topic: {e}")
    
    # Use DB topic if available, otherwise use query param
    final_topic = db_topic if db_topic else topic
    print(f"DEBUG: Stream {session_id} - Using Topic Length: {len(final_topic)}")
    
    return StreamingResponse(
        orchestrator.run_brainstorming_session(final_topic, session_id, agent_ids.split(",") if agent_ids else None),
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
