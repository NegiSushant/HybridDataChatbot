# Agentic Q&A Solution

An intelligent Q&A agent powered by **LangChain**, **Azure OpenAI**, **SQL Server**, and **Azure AI Search**.

## Architecture

```
User Question
     │
     ▼
Master Orchestrator Agent (GPT-4o)
     │
     ├── query_structured_data  →  createSqlAgent → SQL Server
     └── search_unstructured_data  →  Azure AI Search Index
```

## Tech Stack

- **Runtime**: Bun + Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **LLM**: Azure OpenAI (GPT-4o)
- **SQL**: SQL Server via TypeORM + LangChain `createSqlAgent`
- **Search**: Azure AI Search (semantic/keyword)

## Setup

### 1. Clone & Install

```bash
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Run (Development)

```bash
bun run dev
```

### 4. Run (Production)

```bash
bun run start
```

## API Reference

### `POST /api/chat`

Ask a question to the agent.

**Request:**
```json
{
  "question": "What were total sales in Q1 2024?",
  "sessionId": "optional-for-multi-turn"
}
```

**Response:**
```json
{
  "answer": "Total sales in Q1 2024 were $4.2M across all regions...",
  "toolsUsed": ["query_structured_data"],
  "sessionId": "abc-123"
}
```

### `DELETE /api/chat/:sessionId`

Clear conversation history for a session.

### `GET /health`

Health check endpoint.

## Project Structure

```
src/
├── agents/
│   └── masterAgent.ts       # Main orchestrator agent
├── tools/
│   ├── sqlTool.ts           # Wraps createSqlAgent as a DynamicTool
│   └── azureSearchTool.ts   # Azure AI Search DynamicTool
├── config/
│   └── index.ts             # Env var config with validation
├── db/
│   └── sqlConnection.ts     # TypeORM DataSource (singleton)
├── services/
│   └── azureSearch.ts       # Azure AI Search client & search logic
├── routes/
│   └── chat.ts              # POST /api/chat route
├── middleware/
│   └── errorHandler.ts      # Global error handler
└── index.ts                 # Express app entry point
```
