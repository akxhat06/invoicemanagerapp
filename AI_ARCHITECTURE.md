# AI Backend Architecture

## System Flow Diagram

```mermaid
flowchart TD
    subgraph Client["Frontend - Dashboard"]
        UI[Chat Widget]
        SupabaseClient[Supabase Client]
    end

    subgraph API["API Layer - /api/ai"]
        Auth[Auth Handler]
        IntentParse[Intent Parser]
        QueryExec[Query Executor]
        LLMClient[LLM Client]
    end

    subgraph LLMProviders["LLM Providers"]
        Groq[Groq API]
        Anthropic[Anthropic API]
        Gemini[Gemini API]
    end

    subgraph Database["Supabase Database"]
        DB[(PostgreSQL)]
        RLS[RLS Policies]
    end

    User["User"] -->|1. Types Query| UI
    UI -->|2. send query| SupabaseClient
    SupabaseClient -->|3. POST /api/ai| API
    
    API -->|4. Extract Token| Auth
    Auth -->|5. Validate| SupabaseClient
    
    API -->|6. Parse Intent| IntentParse
    IntentParse -->|7. Determine Table/Filters| LLMClient
    
    LLMClient -->|8. Select Provider| LLMProviders
    LLMProviders -->|9. Return Intent| LLMClient
    
    QueryExec -->|10. Build Query| SupabaseClient
    SupabaseClient -->|11. SELECT| DB
    DB -->|12. Check RLS| RLS
    RLS -->|13. Return Data| SupabaseClient
    SupabaseClient -->|14. Results| QueryExec
    
    QueryExec -->|15. Data Summary| LLMClient
    LLMClient -->|16. Generate Answer| LLMProviders
    LLMProviders -->|17. Natural Response| LLMClient
    
    LLMClient -->|18. JSON Response| API
    API -->|19. Answer| SupabaseClient
    SupabaseClient -->|20. Display| UI
    UI -->|21. Show to User| User
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant C as Chat Widget
    participant A as /api/ai
    participant LLM as LLM Provider
    participant DB as Supabase

    U->>C: Enter query
    C->>C: Get session token
    C->>A: POST /api/ai with query and token
    
    A->>A: Validate token and get userId
    
    A->>LLM: Extract intent from query
    LLM-->>A: Return table, filters, aggregates
    
    A->>DB: SELECT from table where user_id
    DB-->>A: Return invoice records
    
    A->>LLM: Generate answer with data
    LLM-->>A: Return natural language answer
    
    A-->>C: Return answer, provider, count
    C->>U: Display response
```

## Data Flow

```mermaid
flowchart LR
    subgraph Input
        Q["User Query: total outstanding"]
    end

    subgraph Processing
        P1[1. Extract Intent]
        P2[2. Build Query]
        P3[3. Execute DB]
        P4[4. Summarize]
        P5[5. Generate Answer]
    end

    subgraph Output
        R["Response: Total outstanding: INR 150000"]
    end

    Q --> P1
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> R
```

## Database Query Mapping

```mermaid
flowchart TD
    subgraph Queries
        Q1["outstanding query"]
        Q2["payments query"]
        Q3["commission query"]
        Q4["invoices query"]
        Q5["retailers query"]
        Q6["companies query"]
    end

    subgraph Intent
        I["User Query"]
    end

    subgraph Response
        R["Answer plus Data"]
    end

    I -->|contains outstanding| Q1
    I -->|contains payment| Q2
    I -->|contains commission| Q3
    I -->|contains invoice| Q4
    I -->|contains retailer| Q5
    I -->|contains company| Q6

    Q1 --> R
    Q2 --> R
    Q3 --> R
    Q4 --> R
    Q5 --> R
    Q6 --> R
```

## File Structure

```
src/
├── lib/
│   └── ai/
│       ├── client.ts        # LLM client (Groq/Anthropic/Gemini)
│       └── schema.ts       # Database schema context
│
└── app/
    └── api/
        └── ai/
            └── route.ts    # Main API endpoint
```

## Environment Variables

```env
# Required
GROQ_API_KEY=gsk_...        # Groq API key

# Optional (fallback order: groq then anthropic then gemini)
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

## API Contract

### Request
```json
POST /api/ai
{
  "query": "total outstanding"
}
```

### Response
```json
{
  "answer": "Total outstanding: INR 150000",
  "provider": "groq",
  "debug": {
    "userId": "abc123...",
    "table": "invoices"
  },
  "summary": "Outstanding: 150000, Count: 5",
  "count": 5
}
```

## Supported Queries

| Query Type | Table | Aggregation |
|------------|-------|-------------|
| outstanding, due | invoices | SUM(outstanding_amount) |
| payments, received | invoice_payments | SUM(amount) |
| commission | invoice_commissions | SUM(commission_amount) |
| invoice | invoices | COUNT |
| retailer | retailers | COUNT |
| company | companies | COUNT |