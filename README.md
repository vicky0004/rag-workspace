# 🚀 RAG Workspace Assistant

A production-grade, multi-workspace **Retrieval-Augmented Generation (RAG)** web application. Upload documents (`.pdf`, `.txt`, `.md`), ask grounded questions with source citations, manage multi-session conversations, and let the AI call tools (like task management and Discord webhooks) with full auditing.

---

## 🌟 Key Features

- **Multi-Tenant Workspace Isolation**: Each user's workspaces and documents are siloed at the database level with Supabase PostgreSQL Row Level Security (RLS) and server-side verification.
- **Smart Document Ingestion & Chunking**: Automatic text extraction for PDF, Markdown, and text files. Embedded into 768-dimensional vectors using `gemini-embedding-001` and indexed with `pgvector`.
- **Grounded Chat with Source Citations**: Cosine similarity matching (`<=>`) retrieves the most relevant chunks. Responses are rendered with rich GitHub-flavored markdown and clickable source badges.
- **Multi-Session Chat History**: Create, switch, rename, and delete conversation sessions with small-text sidebar navigation. Sessions are saved lazily without phantom empty entries.
- **AI Tool Calling & Dashboard Auditing**: Gemini automatically calls tools (`save_task`, `complete_task` / `close_task`, `list_tasks`, `send_discord_summary`). Every execution is audited in the workspace dashboard.
- **Indian Standard Time (IST) Support**: All tool timestamps, task dates, and chat logs are localized to IST (`UTC+05:30`).
- **Modern UI & Dialogs**: Beautiful glassmorphic dark theme, SweetAlert2 modals/toasts, responsive layouts, and interactive modals for workspace management.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Markdown, Remark GFM, SweetAlert2 |
| **Backend** | Node.js (ESM), Express 5, `@google/genai` SDK, `pdf-parse`, `zod`, `jose` |
| **Database & Auth** | Supabase (PostgreSQL 15+, `pgvector` extension, Supabase Auth with JWKS verification) |
| **AI Models** | Google Gemini (`gemini-flash-latest`, `gemini-3.7-flash`, `gemini-embedding-001`) |

---

## 📁 Project Structure

```
rag-workspace/
├── backend/                  # Node.js + Express backend API
│   ├── src/
│   │   ├── config/           # Gemini & Supabase clients
│   │   ├── middleware/       # Auth JWT verification via JWKS
│   │   ├── routes/           # Workspaces, Documents, Chat, Dashboard, Tasks
│   │   └── server.js         # Express server entry point
│   ├── .env.example          # Backend environment variables template
│   └── package.json
├── frontend/                 # React 19 + Vite frontend
│   ├── src/
│   │   ├── components/       # Sidebar, WorkspaceModal, Navbar
│   │   ├── contexts/         # AuthContext, WorkspaceContext, ChatContext
│   │   ├── lib/              # API helpers, SweetAlert2 alerts, Supabase client
│   │   ├── pages/            # AuthPage, ChatPage, DocumentsPage, DashboardPage
│   │   └── App.jsx
│   ├── .env.example          # Frontend environment variables template
│   └── package.json
├── supabase/
│   └── migrations/           # PostgreSQL schemas, RLS policies, vector search RPC
├── AI_NOTES.md               # Architecture decisions, AI workflow, and debugging notes
└── README.md
```

---

## 🚀 Getting Started (Step-by-Step)

Follow these steps to clone the repository and start the project locally with your own credentials.

### Prerequisites

1. **Node.js** (v18 or higher) and **npm**
2. A free **[Supabase](https://supabase.com)** account
3. A free **[Google AI Studio](https://aistudio.google.com)** Gemini API Key

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/vicky0004/rag-workspace.git
cd rag-workspace
```

---

### Step 2: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a **New Project**.
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Run the SQL migration files located in `supabase/migrations/` in chronological order:
   - `20260926174152_initial_schema.sql` (Creates `workspaces`, `documents`, `chunks`, `tasks`, `tool_calls`, `chat_messages` tables & pgvector)
   - `20260926180804_rls_workspace_isolation.sql` (Enables Row Level Security policies)
   - `20260927000001_schema_patches.sql`
   - `20260927000002_match_chunks_rpc.sql` (Creates vector cosine search RPC function)
   - `20260927000003_task_status.sql`
   - `20260927000004_chat_sessions.sql` (Adds `chat_sessions` table)
   - `20260927000005_chat_sessions_rls.sql` (Adds RLS policies for chat sessions)

4. Collect your Supabase credentials from **Project Settings → API**:
   - **Project URL** (`SUPABASE_URL`)
   - **Anon / Public Key** (`SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_ANON_KEY`)
   - **Service Role Secret Key** (`SUPABASE_SECRET_KEY`)

---

### Step 3: Configure the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your keys:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   SUPABASE_SECRET_KEY=your_supabase_service_role_secret_key
   SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
   GEMINI_API_KEY=your_google_gemini_api_key
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...  # (Optional for Discord tool)
   FRONTEND_URL=http://localhost:5173
   PORT=5000
   ```
4. Install dependencies and start the backend development server:
   ```bash
   npm install
   npm run dev
   ```
   *The backend will start on `http://localhost:5000`.*

---

### Step 4: Configure the Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and set your Supabase public keys and API URL:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_URL=http://localhost:5000
   ```
4. Install dependencies and start the frontend development server:
   ```bash
   npm install
   npm run dev
   ```
   *The frontend will start on `http://localhost:5173`.*

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Your Supabase project URL (`https://xyz.supabase.co`) |
| `SUPABASE_SECRET_KEY` | Yes | Supabase Service Role Secret Key (keeps database secure on backend) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase Anon/Publishable API Key |
| `SUPABASE_JWKS_URL` | Yes | Supabase JWKS verification URL: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `GEMINI_API_KEY` | Yes | Google AI Studio Gemini API Key |
| `DISCORD_WEBHOOK_URL` | Optional | Discord Webhook URL for the `send_discord_summary` tool |
| `FRONTEND_URL` | Yes | Allowed frontend origin for CORS (e.g. `http://localhost:5173`) |
| `PORT` | No | Server port (default `5000`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase Anon / Public Key for client authentication |
| `VITE_API_URL` | Yes | Backend server base URL (`http://localhost:5000`) |

---

## 🧪 Testing the Application

1. **Sign Up / Login**: Open `http://localhost:5173` and create an account with your Name, Email, and Password.
2. **Create a Workspace**: Click **New Workspace** from the dropdown menu (e.g., "Finance Q3" or "Engineering Docs").
3. **Upload Documents**: Navigate to the **Documents** tab and upload sample `.pdf`, `.txt`, or `.md` files. Watch them process into vector chunks.
4. **Chat & Ask Questions**:
   - Ask specific questions about your uploaded documents. Check the generated answers and citation sources.
   - Click **+ New Chat** or the **Chat** navigation item to start a fresh conversation session.
   - Rename or delete past chat history sessions from the 3-dot options menu.
5. **Trigger AI Tools**:
   - In chat, say: *"Please save a task to verify financial numbers with the audit team."*
   - Or ask: *"What are my current pending tasks?"* / *"Complete the task regarding financial audit."*
6. **Check the Dashboard**: Switch to the **Dashboard** tab to view your active documents, task checklist with status toggles, and the live tool-call audit log.

---

## 🛡️ Security Best Practices

- **Secret Isolation**: `GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`, and `DISCORD_WEBHOOK_URL` are strictly stored on the backend and are **never** exposed to the client bundle.
- **Strict Ownership Verification**: Every route verifies `workspaces.user_id = req.user.id` on the server before reading or writing data.
- **Prompt Injection Defense**: Injected document chunks are framed strictly as untrusted data blocks to prevent documents from overriding system directives or calling unauthorized tools.

---

## 🌐 Production Deployment

- **Frontend**: Deploy to **[Vercel](https://vercel.com)** or **[Netlify](https://netlify.com)**. Connect your repository and configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` in the project settings.
- **Backend**: Deploy to **[Render](https://render.com)** or **[Railway](https://railway.app)** as a Node.js web service. Add all environment variables from `backend/.env`.

---

## 👨‍💻 Author

**Vicky Kumar**  
- **GitHub**: [@vicky0004](https://github.com/vicky0004)  
- **LinkedIn**: [linkedin.com/in/vicky-cse04](https://linkedin.com/in/vicky-cse04)  
- **Portfolio**: [csevicky.netlify.app](https://csevicky.netlify.app/)  
- **Email**: [csevicky03@gmail.com](mailto:csevicky03@gmail.com)