# Multi-Agent Brainstorming System

A sophisticated, AI-powered brainstorming platform that orchestrates a team of specialized agents to generate, critique, and refine ideas in real-time. The system features continuous debate, progressive depth, and intelligent insight clustering.

![Project Status](https://img.shields.io/badge/status-active-success) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Features

### 🧠 Intelligent Agents
The system orchestrates a diverse team of AI personae, each with a unique perspective:
- **The Optimist**: Generates creative, blue-sky ideas and focuses on potential.
- **The Skeptic**: Identifying risks, flaws, and constraints.
- **The Analyst**: Breaks down ideas into technical components and feasibility.
- **The Evaluator**: Synthesizes viewpoints and provides balanced judgment.

### 🔄 Continuous & Progressive Brainstorming
- **Infinite Loop**: The agents engage in a continuous round-robin debate that runs indefinitely until you decide to stop.
- **Progressive Depth**: The conversation evolves intelligently over time:
    - **Round 0**: Creative Idea Generation (Quantity & Novelty)
    - **Round 1**: Critical Analysis & Risk Identification
    - **Round 2**: Concrete Solution Proposals & Refinements
    - **Round 3+**: Deep Debate, Edge Cases, and Long-term Implications

### 📊 AI-Driven Analysis
- **Semantic Clustering**: Automatically groups hundreds of generated ideas based on semantic similarity using embedding models (`all-MiniLM-L6-v2`).
- **Smart Naming**: Uses a Large Language Model (LLM) to analyze each cluster and generate meaningful, punchy titles and descriptions (e.g., "Regulatory Challenges" instead of "Cluster 1").

### 💻 Modern Experience
- **Real-Time Streaming**: Watch agents type out their thoughts live via Server-Sent Events (SSE).
- **Session Persistence**: Full history is saved to Supabase, allowing you to pause, resume, or reload sessions anytime.
- **Glassmorphic UI**: A beautiful, dark-mode interface built with Next.js and Tailwind CSS.
- **Full Control**: Pause/Resume the stream or End the session at your convenience.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, Python 3.9+, Server-Sent Events (SSE)
- **AI/ML**: 
    - **LLM**: Google Gemini 1.5/2.0 Flash (via `google-generativeai`) or Ollama (Local Fallback)
    - **Embeddings**: SentenceTransformers (`all-MiniLM-L6-v2`)
    - **Clustering**: Scikit-Learn (Agglomerative Clustering)
- **Database**: Supabase (PostgreSQL + pgvector)

---

## ⚡ Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Supabase Account
- Google Gemini API Key

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env file
echo "SUPABASE_URL=your_url" >> .env
echo "SUPABASE_KEY=your_key" >> .env
echo "LLM_API_KEY=your_gemini_key" >> .env

# Run Server
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
1. Open `http://localhost:3000`.
2. Enter a topic (e.g., "Future of Space Travel").
3. Click "Start Brainstorming" and watch the agents debate.
4. Let it run for a few rounds to see the depth increase.
5. Click **"Cluster Ideas"** to see AI-generated insights.

---

## 🔒 Architecture

1. **Orchestration**: The `Orchestrator` service cycles through agents, managing the context window and injecting progressive system prompts based on the round number.
2. **State Management**: Every response is asynchronously streamed to the client and persisted to the `responses` table in Supabase.
3. **Clustering Pipeline**: 
    - Fetches text -> Generates Embeddings -> Runs Agglomerative Clustering.
    - Samples text from each cluster -> Prompts LLM for a title -> Saves to `clusters` table.
