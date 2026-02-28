# Real-Time Collaborative Code Editor 🚀

![Editor Preview](https://github.com/Nsai-roshan/Real-Time-Collaborative-Code-Editor/blob/master/assets/editor_screenshot.png?raw=true)

Hi! Welcome to my **Real-Time Collaborative Code Editor** project. I built this from scratch to explore how complex distributed systems like Google Docs handle conflict resolution and multi-cursor synchronization using Conflict-Free Replicated Data Types (CRDTs).

## Features
- **Live Multi-Cursor Editing:** Watch your collaborators type in real-time.
- **Yjs CRDT Engine:** Peer-to-peer conflict resolution guarantees that even under heavy editing or network latency, all clients converge on the exact same document state.
- **Document Version History:** Browse named snapshots of the document and instantly highlight modifications with a sleek split-pane Visual Diff Editor.
- **Robust Persistence:** Edits are stored safely in a PostgreSQL database through an automated, periodic syncing layer securely attached to our backend WebSockets.
- **Modern UI:** A responsive, fast, and gorgeous glassmorphic dashboard powered by React and Vite to manage your documents.
- **Syntax Highlighting:** Industry standard code-editing experience backed by the Monaco Editor.

## System Architecture

The architecture scales horizontally. All WebSocket servers independently stream CRDT Uint8Array state updates, while Upstash Redis acts as the centralized Pub/Sub message broker to sync instances. Let's break it down:

```mermaid
graph TD
    Client1[Frontend Client A (React/Vite)] <-->|WebSocket| WS1[Backend Node.js WS Server 1]
    Client2[Frontend Client B (React/Vite)] <-->|WebSocket| WS2[Backend Node.js WS Server 2]
    
    WS1 <-->|Pub/Sub Sync| Redis[(Upstash Redis Message Broker)]
    WS2 <-->|Pub/Sub Sync| Redis
    
    WS1 -->|Auto-saves CRDT Data| DB[(Supabase PostgreSQL)]
    WS2 -->|Auto-saves CRDT Data| DB
```

## Tech Stack
I didn't hold back when designing the architecture for this application:

- **Frontend:** React (Vite), TypeScript, TailwindCSS, Monaco Editor.
- **Backend API:** Node.js, Express, TypeScript.
- **WebSockets:** Raw `ws` with `y-websocket` bindings.
- **Data Persistence:** Prisma ORM, PostgreSQL (via Supabase).
- **Scale-Out Pub/Sub:** Upstash Serverless Redis.

## Running Locally

I've containerized the entire application to make running the production build incredibly easy locally. You can either run the dev servers natively using `npm run dev`, or you can simply spin up everything with Docker.

### Running with Docker (Recommended)
1. Copy `backend/.env.example` to `backend/.env` and configure your database and redis connection strings.
2. Ensure Docker Desktop is running on your machine.
3. Run the following command via terminal in the root directory:
   ```bash
   docker-compose up --build
   ```
4. Access the frontend app at `http://localhost:5173`.
5. Access the backend API at `http://localhost:3001`.

### Running Natively (Node.js)
If you prefer running without Docker:
1. Copy the `.env.example` configurations.
2. Open two terminal instances.
3. In terminal 1: `cd backend && npm install && npx prisma db push && npm run dev`
4. In terminal 2: `cd frontend && npm install && npm run dev`


## Future Roadmap
Looking ahead, I have plans to expand the feature-set:
- **Language Server Protocol (LSP)** integration for auto-completion.
- **Voice/Video call** integration for true pair-programming.
- **OAuth (GitHub/Google)** authentication for seamless sign-ups.

Thanks for checking out my project!
