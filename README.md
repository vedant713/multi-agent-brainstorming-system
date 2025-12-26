# Multi-Agent Brainstorming System

A sophisticated, AI-powered brainstorming platform that orchestrates a team of specialized agents to generate, critique, and refine ideas in real-time. The system features continuous debate, progressive depth, intelligent insight clustering, and now a fully customizable agent builder.

![Project Status](https://img.shields.io/badge/status-active-success) ![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Features

### 🧠 Intelligent Agents & Builder
The system orchestrates a diverse team of AI personae:
- **Core Team**: Optimist, Skeptic, Analyst, Evaluator.
- **Custom Agents**: Create your own agents with unique names, roles, and system prompts.
- **Agent Library**: Quickly onboard specialized agents (e.g., Growth Hacker, Legal Counsel, Visionary) from our built-in library.
- **Flexible Management**: Assemble your squad by toggling default agents on/off and removing custom ones.

### 🔄 Continuous & Progressive Brainstorming
- **Infinite Loop**: The agents engage in a continuous round-robin debate that runs indefinitely until you decide to stop.
- **Progressive Depth**: The conversation evolves intelligently over time:
    - **Round 0**: Creative Idea Generation (Quantity & Novelty)
    - **Round 1**: Critical Analysis & Risk Identification
    - **Round 2**: Concrete Solution Proposals & Refinements
    - **Round 3+**: Deep Debate, Edge Cases, and Long-term Implications

### 📂 Contextual Intelligence
- **File Uploads**: Attach PDFs or Images to your brainstorming session. The system uses OCR to extract text and context, allowing agents to analyze your documents directly.
- **Semantic Clustering**: Automatically groups hundreds of generated ideas based on semantic similarity using embedding models.

### 💻 Modern Experience
- **Real-Time Streaming**: Watch agents type out their thoughts live via Server-Sent Events (SSE).
- **Glassmorphic UI**: A beautiful, dark-mode interface with cinematic animations.
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
- Google Gemini API Key (optional, defaults to local LLM if missing/invalid)

### One-Click Setup (Mac/Linux)
We provide a unified startup script that handles virtual environments, dependencies, and server launching.

```bash
# 1. Clone the repo
git clone https://github.com/vedantdhoke/multi-agent-brainstorming-system.git
cd multi-agent-brainstorming-system

# 2. Configure Environment
# Create a .env file in the root directory (or let the script warn you)
echo "SUPABASE_URL=your_url" >> .env
echo "SUPABASE_KEY=your_key" >> .env
echo "LLM_API_KEY=your_gemini_key" >> .env

# 3. Launch
./start_dev.sh
```

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Usage
1. Open `http://localhost:3000`.
2. **Assemble Your Squad**: Select default agents or create new ones from the Library.
3. **Set Context**: Enter a topic (e.g., "Future of Space Travel") or upload a PDF.
4. Click "Start" and watch the debate unfold.
5. Use the **Analysis** tab to see clustered insights.

---

## 🔒 Architecture

1. **Orchestration**: The `Orchestrator` service cycles through agents, managing the context window and injecting progressive system prompts based on the round number.
2. **State Management**: Every response is asynchronously streamed to the client and persisted to the `responses` table in Supabase.
3. **Clustering Pipeline**: 
    - Fetches text -> Generates Embeddings -> Runs Agglomerative Clustering.
    - Samples text from each cluster -> Prompts LLM for a title -> Saves to `clusters` table.
