# Flow Diagram

## Full System Flow

```mermaid
flowchart TB
    subgraph User_Layer["User"]
        Chat["Chat Widget"]
    end

    subgraph Frontend["Next.js Frontend"]
        Session["Session Manager"]
        API_Call["Fetch /api/ai"]
    end

    subgraph API_Layer["API Route"]
        Auth["Validate Token"]
        Intent["Parse Intent"]
        Query["Build Query"]
        LLM["Call LLM"]
    end

    subgraph LLM_Providers["LLM Providers"]
        G["Groq"]
        A["Anthropic"]
        C["Gemini"]
    end

    subgraph DB_Layer["Supabase"]
        Supabase["Supabase Client"]
        Tables["Tables"]
        RLS["RLS Policies"]
    end

    User -->|1 Type Query| Chat
    Chat -->|2 Get Session| Session
    Session -->|3 POST /api/ai| API_Call
    API_Call -->|4 Validate| Auth
    
    Auth -->|5 Intent| Intent
    Intent -->|6 Prompt| LLM
    
    LLM -->|7 Choose| G
    G -->|8 Return Intent| LLM
    
    LLM -->|9 Build| Query
    Query -->|10 SELECT| Supabase
    Supabase -->|11 Check RLS| RLS
    RLS -->|12 Return Data| Supabase
    Supabase -->|13 Data| Query
    
    Query -->|14 Data Summary| LLM
    LLM -->|15 Generate| G
    G -->|16 Answer| LLM
    
    LLM -->|17 JSON| API_Call
    API_Call -->|18 Display| Chat
    Chat -->|19 Response| User
```

## Query Processing Flow

```mermaid
flowchart LR
    subgraph Step1["Step 1 Input"]
        Input["User Query: total outstanding"]
    end

    subgraph Step2["Step 2 Intent Detection"]
        Detect["LLM detects: table, filters, aggregate"]
    end

    subgraph Step3["Step 3 Query Execution"]
        DB["Supabase SELECT with filters"]
    end

    subgraph Step4["Step 4 Result"]
        Result["Response: INR 150000"]
    end

    Input --> Detect
    Detect --> DB
    DB --> Result
```

## LLM Provider Selection

```mermaid
flowchart TD
    Start[Start] --> Check1{Anthropic API available?}
    Check1 -->|Yes| UseA[Use Anthropic]
    Check1 -->|No| Check2{Groq API available?}
    
    Check2 -->|Yes| UseG[Use Groq]
    Check2 -->|No| Check3{Gemini API available?}
    
    Check3 -->|Yes| UseC[Use Gemini]
    Check3 -->|No| Error[Return Error]
    
    UseA --> Respond
    UseG --> Respond
    UseC --> Respond
    Respond[Return Response]
```

## Database Query Mapping

```mermaid
erDiagram
    USER ||--o{ INVOICE : creates
    USER ||--o{ RETAILER : manages
    USER ||--o{ COMPANY : owns
    USER ||--o{ INVOICE_PAYMENT : records
    USER ||--o{ INVOICE_COMMISSION : earns
    USER ||--o{ INVOICE_GOODS_RETURN : receives
    
    INVOICE ||--o{ INVOICE_PAYMENT : has
    INVOICE ||--o{ INVOICE_COMMISSION : generates
    INVOICE ||--o{ INVOICE_GOODS_RETURN : contains
    INVOICE }o--|| RETAILER : billed_to
    INVOICE }o--|| COMPANY : belongs_to
    COMPANY ||--o{ RETAILER : supplies
```

## Error Handling Flow

```mermaid
flowchart TD
    Request[API Request] --> Valid{Token Valid?}
    Valid -->|No| Error401[401 Unauthorized]
    Valid -->|Yes| QueryValid{Query Present?}
    
    QueryValid -->|No| Error400[400 Query Required]
    QueryValid -->|Yes| ProviderCheck{Provider Available?}
    
    ProviderCheck -->|No| ErrorProv[500 No Provider]
    ProviderCheck -->|Yes| ExecuteQuery
    
    ExecuteQuery --> QuerySuccess{Query Success?}
    QuerySuccess -->|No| ErrorQuery[500 Query Error]
    QuerySuccess -->|Yes| ReturnResponse
    
    ReturnResponse[200 OK] --> End
    Error401 --> End
    Error400 --> End
    ErrorProv --> End
    ErrorQuery --> End
```

## Key Files and Their Role

```mermaid
flowchart LR
    subgraph Files
        A[client.ts]
        B[schema.ts]
        C[route.ts]
        D[dashboard-layout.tsx]
    end

    subgraph Role
        R1[Manages LLM providers]
        R2[Provides DB schema]
        R3[Handles API requests]
        R4[Contains Chat UI]
    end

    A -.-> R1
    B -.-> R2
    C -.-> R3
    D -.-> R4
```

## Data Format

### Input (from Chat)
```json
{
  "query": "total outstanding from company ABC"
}
```

### Output (to Chat)
```json
{
  "answer": "Total outstanding from ABC company is INR 150000",
  "provider": "groq",
  "summary": "Outstanding: 150000, Count: 5",
  "count": 5
}
```