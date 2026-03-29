<div align="center">

<img src="public/icon2.svg" alt="Invoice Manager logo" width="200" height="200" />

# Invoice Manager

**Manage companies and retailer invoices in one place.**

A mobile-friendly [Next.js](https://nextjs.org) dashboard backed by [Supabase](https://supabase.com) (Auth, Postgres, Row Level Security).

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?logo=supabase)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

Invoice Manager helps you:

- Track **companies** you work with  
- Create and manage **retailer invoices**  
- See **dashboard stats** (counts at a glance)  
- Complete a **welcome tour** on first sign-in  
- Use **light / dark** themes  

---

## Screenshots & branding

| | |
|:--|:--|
| **Logo** | <img src="public/logo.svg" alt="Logo" width="72" /> |
| **UI** | *Add your own screenshots:* place PNGs under `docs/screenshots/` and link them here, e.g. `![Dashboard](docs/screenshots/dashboard.png)`. |

---

## Architecture

How the app talks to Supabase:

```mermaid
flowchart LR
  subgraph browser["Browser"]
    UI["Next.js App Router<br/>(React 19)"]
  end
  subgraph supabase["Supabase"]
    AUTH["Auth (JWT)"]
    PG[("Postgres + RLS")]
  end
  UI -->|"SSR / cookies"| AUTH
  UI -->|"@supabase/ssr"| PG
```

---

## User flow (high level)

From sign-in through daily use:

```mermaid
flowchart TB
  A([Visit app]) --> B{Signed in?}
  B -->|No| C[Login / Sign up]
  C --> D[Session / Profile]
  B -->|Yes| D
  D --> E["Dashboard<br/>overview & counts"]
  E --> F["Companies<br/>list & details"]
  E --> G["Invoices<br/>retailer invoices"]
  F --> G
  D --> H{First visit?}
  H -->|"welcome_tour null"| I["Welcome tour<br/>spotlight UI"]
  I --> J["Mark tour complete<br/>in profiles"]
  J --> E
  H -->|done| E
```

---

## Data model (simplified)

Core tables and relationships:

```mermaid
erDiagram
  USER {
    uuid id PK
  }
  USER ||--|| profiles : maps
  USER ||--o{ companies : owns
  USER ||--o{ retailer_invoices : owns
  profiles {
    uuid id PK
    timestamptz welcome_tour_completed_at
  }
  companies {
    uuid id PK
    uuid user_id FK
  }
  retailer_invoices {
    uuid id PK
    uuid user_id FK
  }
```

> `USER` stands in for Supabase **`auth.users`**. Table names match your migrations under `supabase/migrations/`—adjust the diagram if your schema diverges.

---

## Request flow (dashboard counts)

Example: loading the home dashboard:

```mermaid
sequenceDiagram
  participant U as User
  participant P as Next.js page
  participant S as Supabase
  U->>P: GET /
  P->>S: auth.getUser()
  S-->>P: user id
  P->>S: count companies, retailer_invoices
  S-->>P: counts (RLS scoped)
  P-->>U: HTML + stats
```

---

## Getting started

### Prerequisites

- Node.js 20+  
- A [Supabase](https://supabase.com) project  

### Environment

Create `.env` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Apply migrations (CLI or SQL editor):

```bash
supabase db push
# or run files in supabase/migrations/ in order
```

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

---

## Project layout (short)

| Path | Role |
|------|------|
| `src/app/` | App Router routes (`(dashboard)`, auth, etc.) |
| `src/components/` | UI (dashboard, companies, invoices, theme) |
| `src/lib/supabase/` | Supabase client (server & browser) |
| `supabase/migrations/` | SQL schema & RLS |

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)  
- [Supabase docs](https://supabase.com/docs)  

---

<div align="center">

**Invoice Manager** — *Manage your business, effortlessly.*

</div>
