# BookLeaf Author Support Portal — Approach & Architecture Write-Up

**Candidate Assessment Submission — Assignment 1 of 2**  
*Full-Stack Developer Position (BookLeaf Publishing)*

---

### 1. Executive Summary & Core Priorities
BookLeaf processes 1,200+ monthly titles across a catalog exceeding 22,000 books. Handling author inquiries manually creates response bottlenecks, irregular updates, and operational debt. The core priority of this system was to engineer a resilient, dual-interface ticketing platform that resolves communication latency through:
1. **Zero-friction triage**: Automated categorization and urgency prioritization at the exact moment a query is submitted.
2. **Context-aware draft assistance**: Equipping support administrators with 1-click draft responses informed by real catalog metadata and official BookLeaf policies.
3. **Data isolation & role integrity**: Ensuring authors have transparent access to their royalty balances and book production stages while preserving administrative operational controls.

---

### 2. Architecture & Design Decisions

#### A. Decoupled Service Architecture
- **Frontend (React 18 + Vite)**: Chosen for instant hot-module replacement, high rendering performance, and clear route guards via React Router v6. State management is structured cleanly with React Context (`AuthContext`) and custom hooks, eliminating unnecessary third-party state library dependencies.
- **Backend (Node.js + Express REST API)**: Clean layered pattern (Controllers/Routes, Middleware, Services, DB Configuration).
- **Data Layer (Knex.js + SQLite)**: SQLite provides zero-configuration relational persistence for development and local testing. Knex.js provides schema definition, connection pooling, and parameterized queries that protect against SQL injection while making future migration to PostgreSQL or MySQL seamless.

#### B. AI Strategy & Dual-Engine Fallback
The AI implementation was designed around **operational reliability and cost awareness**:
- **Groq LPU Acceleration (`openai/gpt-oss-120b`)**: Utilizes Groq's high-throughput endpoint with strict JSON outputs (`response_format: { type: 'json_object' }`) for deterministic categorization and priority scoring.
- **Strict Knowledge Grounding**: Prompts inject the BookLeaf Knowledge Base (80/20 royalty split, ₹1,000 threshold, 5–7 business days reprint turnaround, etc.) alongside the author's real sales figures and current pipeline stage.
- **Graceful Degradation (Contextual NLP Fallback)**: If Groq experiences rate limiting, service outages, or missing credentials, the system automatically falls back to an internal rule-based knowledge engine. Tickets never fail to submit, and staff are always provided with a relevant draft.

#### C. Communication Layer
Rather than aggressive short-interval polling, the system implements **Server-Sent Events (SSE)** on `/api/tickets/:id/stream`. This enables unidirectional push updates from staff to authors in near-real-time without WebSocket handshake overhead.

---

### 3. Key Trade-Offs

| Decision Made | Alternative Considered | Rationale & Trade-off |
|---|---|---|
| **SQLite with Knex.js** | Managed PostgreSQL | Chosen for immediate out-of-the-box local evaluation and portable grading. For production scale, PostgreSQL with read replicas would be deployed. |
| **Server-Sent Events (SSE)** | Full WebSockets | SSE works over standard HTTP/2, auto-reconnects natively in browsers, and avoids maintaining stateful bidirectional socket clusters on the backend. |
| **Vanilla CSS Design System** | Tailwind / Component UI Lib | Avoided dependency bloat; implemented a bespoke dark-mode UI with high contrast, responsive grid layouts, and zero build tool conflicts. |

---

### 4. Path to Production Scale

If deploying this platform to production for BookLeaf's 22,000+ title catalog, the next evolutionary steps would include:
1. **Database Migration to PostgreSQL**: Leverage Knex migrations to connect to a managed RDS PostgreSQL instance with read replicas and row-level security.
2. **Asynchronous Background Workers**: Decouple LLM calls and third-party marketplace webhooks from the HTTP request-response cycle using BullMQ or Redis-backed task queues.
3. **Cloud Object Storage (S3 / GCS)**: Implement presigned URL uploads for author-submitted defect photos and sample proofs.
4. **Audit Logging & Analytics**: Add an audit trail table to track admin priority adjustments, agent response times, and author satisfaction metrics (CSAT).

