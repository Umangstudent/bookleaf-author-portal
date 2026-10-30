# BookLeaf Publishing — Author Support & Communication Portal

> **Full-Stack Developer Technical Assessment (Assignment 1 of 2)**  
> Built for BookLeaf Publishing: solving author communication challenges at scale with automated classification, context-aware AI drafting, and a responsive portal for authors and support administrators.

---

## 🌐 Live Demo & Repository Links

- **Frontend Live Demo**: [https://bookleaf-author-portal-seven.vercel.app](https://bookleaf-author-portal-seven.vercel.app)
- **Backend API Server**: [https://bookleaf-author-portal-5lp9.onrender.com](https://bookleaf-author-portal-5lp9.onrender.com)
- **GitHub Repository**: [https://github.com/Umangstudent/bookleaf-author-portal](https://github.com/Umangstudent/bookleaf-author-portal)

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18 + Vite, React Router v6, Context API (`AuthContext`), pure responsive CSS design system.
- **Backend**: Node.js + Express REST API, Knex.js query builder, SQLite3 relational database (`backend/data/bookleaf.db`).
- **Authentication**: JWT token-based authentication with bcrypt password hashing and role-based route guards (`author` vs `admin`).
- **AI Integration**: Groq API (`openai/gpt-oss-120b`) via OpenAI-compatible endpoint with strict JSON schema parsing and automatic contextual NLP fallback when offline or unconfigured.
- **Real-Time Updates**: Server-Sent Events (SSE) for near-instant message streaming without excessive client polling.

---

## 🔐 Demo Credentials (1-Click Login Available)

Use the 1-click demo login buttons directly on the login screen or enter the credentials below:

### ⚡ Support Administrators
| Role | Email | Password |
|---|---|---|
| **BookLeaf Admin** | `admin@bookleaf.com` | `admin123` |
| **Support Agent** | `support@bookleaf.com` | `admin123` |

### ✍️ Authors (Password for all: `password123`)
| Author Name | Email | Scenario / Catalog Highlights |
|---|---|---|
| **Priya Sharma** | `priya.sharma@email.com` | 2 books, active printing & royalty queries |
| **Rohit Kapoor** | `rohit.kapoor@email.com` | 2 books, royalty reconciliation inquiry |
| **Ananya Reddy** | `ananya.reddy@email.com` | 1 book, account/bank update inquiry |
| **Vikram Joshi** | `vikram.joshi@email.com` | High-volume seller catalog |
| **Meera Nair** | `meera.nair@email.com` | Distribution & Amazon availability inquiry |
| **Sneha Kulkarni** | `sneha.kulkarni@email.com` | Books in editing & formatting pipeline |

---

## 🌟 Key Features Implemented

### 1. ✍️ Author Support Portal (`/author`)
- **Author Dashboard**: Overview of lifetime royalties earned (₹), copies sold, catalog count, and quick access to open tickets.
- **My Books Catalog**: Displays book metadata, ISBN-13, current pipeline status (`Published & Live`, `In Production - Typesetting`, etc.), MRP, copies sold, and net royalty balance.
- **Support Request Composer**: Raise queries tied to a specific book or general account level with categorized issues.
- **Conversation Thread**: Near-real-time updates via Server-Sent Events (SSE) with timestamped responses from BookLeaf support staff.

### 2. ⚡ Admin Operations Desk (`/admin`)
- **Executive Operations Dashboard**: High-level triage metrics (Open, In Progress, Resolved tickets, Critical/High urgent counters, category distribution).
- **Ticket Queue with Triage**: Filter tickets by Status, Category, Priority, and keyword search. Tickets are sorted so urgent and open inquiries appear first.
- **Resolution Workbench**:
  - Author and book sales metadata sidebar for instant context.
  - **AI Copilot (Draft Generator)**: Synthesizes responses adhering to BookLeaf policies (80/20 royalty split, quarterly payouts, reprint policies).
  - **Internal Staff Notes**: Private messages visible only to BookLeaf administrators for team handoffs.
  - **Workflow Triage**: Real-time status changes, re-prioritization, and agent assignment.

---

## 🤖 AI Integration Details

1. **Prompt Engineering & Tone**:
   - Prompts include the official BookLeaf Publishing Knowledge Base (80/20 royalty split, ₹1,000 threshold, 5–7 business days reprint timeline, Delhi warehouse details).
   - Responses start with the author's first name, use empathetic language, cite exact numbers, and conclude with clear next steps.
2. **Cost Awareness & Token Optimization**:
   - Tickets are classified using minimal JSON prompts with strict schemas (`response_format: { type: 'json_object' }`).
   - Draft generation transmits only the relevant book sales figures and query context rather than unneeded historic message dumps.
3. **Graceful Degradation (Fallback Engine)**:
   - If the Groq API key is missing, network is unavailable, or rate limits are hit, the system automatically falls back to an internal **Contextual NLP Engine** without failing the user request.
4. **Security**:
   - API keys are strictly kept on the backend in `.env`. They are never passed to the frontend or checked into version control.

---

## 📡 REST API Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate author or admin | Public |
| `GET` | `/api/auth/me` | Get currently logged-in user profile | Authenticated |
| `GET` | `/api/books/my` | Retrieve authenticated author's book catalog | Author only |
| `GET` | `/api/tickets` | List tickets (author sees own; admin sees all) | Authenticated |
| `POST` | `/api/tickets` | Submit new ticket with AI auto-classification | Author only |
| `GET` | `/api/tickets/:id` | Get ticket details and conversation thread | Authenticated (Author-restricted) |
| `PATCH` | `/api/tickets/:id` | Update status, priority, category, or assignee | Admin only |
| `POST` | `/api/tickets/:id/messages` | Post reply or staff internal note | Authenticated |
| `GET` | `/api/tickets/:id/ai-draft` | Generate contextual response draft | Admin only |
| `GET` | `/api/tickets/:id/stream` | Server-Sent Events (SSE) live updates | Authenticated |
| `GET` | `/api/admin/stats` | Operational KPIs and category breakdown | Admin only |
| `GET` | `/api/admin/authors` | Author directory with sales & royalty metrics | Admin only |
| `GET` | `/api/admin/admins` | List staff members for ticket assignment | Admin only |

---

## 🚀 Local Quick Start & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env     # Configure your GROQ_API_KEY (optional, fallback available)
node src/utils/seed.js   # Seeds database with sample dataset (authors, books, tickets)
npm start                # Server runs on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev              # Client runs on http://localhost:5173
```

---

## 🔍 Known Limitations & Future Improvements

- **WebSockets / Socket.io**: While Server-Sent Events (SSE) efficiently push updates down to clients, full bidirectional WebSockets would allow typing indicators and agent read receipts.
- **Attachment Storage**: File upload UI is prepared in the submit form; direct S3/Cloud Storage presigned URLs would be added in a production release.
- **Audit Logs**: Adding an immutable audit log table for admin priority and status overrides.
