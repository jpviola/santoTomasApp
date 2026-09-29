# StoTomas AI

Scholastic multi-agent debate system inspired by Thomas Aquinas. Generate structured Thomistic disputations (objections, sed contra, respondeo, replies, and application) powered by LLM agents.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │DebateForm│  │HomePageClient│  │  DebateSidebar   │   │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘   │
│       │               │                   │              │
│  ┌────▼───────────────▼───────────────────▼─────────┐   │
│  │            useDebateManager hook                 │   │
│  │  (state, streaming, cache, history)              │   │
│  └─────────────────────┬───────────────────────────┘   │
└────────────────────────┼───────────────────────────────┘
                         │ POST /api/debate/process (SSE)
┌────────────────────────▼───────────────────────────────┐
│                    API Layer                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  route.ts (streaming) → runDebate()              │  │
│  └─────────────────────┬────────────────────────────┘  │
│                        │                                │
│  ┌─────────────────────▼────────────────────────────┐  │
│  │           runDebate (Orchestrator)               │  │
│  │  1. Moderate + retrieve sources                  │  │
│  │  2. Run scholastic debate (single-pass)          │  │
│  │  3. Validate & persist                           │  │
│  └────┬──────────┬──────────────┬───────────────────┘  │
└───────┼──────────┼──────────────┼──────────────────────┘
        │          │              │
   ┌────▼────┐ ┌───▼────┐  ┌─────▼──────┐
   │Moderator│ │Scholastic│  │ Ontology   │
   │ Agent   │ │ Debate   │  │ Engine     │
   └─────────┘ └──────────┘  └─────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │  GraphDB    │
                            │  (SPARQL)   │
                            └─────────────┘
```

## Agent Flow

1. **Moderator** - Restates the question, frames it, lists the distinctions the answer needs, and proposes search keywords and the Summa articles where Aquinas treats the question
2. **Retrieval** - Combines the proposed loci with a hybrid search over the knowledge base (`knowledge/`, see below) and, optionally, GraphDB
3. **Hydration** - Replaces each Summa source with Aquinas's real text in the answer language (EN: New Advent, ES: hjg.com.ar, LA: Corpus Thomisticum). Proposed citations that can't be fetched are dropped, so invented references never reach the reader; sources are labeled `text` or `summary`
4. **ScholasticDebate** - Single-pass generation of objections, sed contra, respondeo, replies, and application, using the moderator's distinctions and the chosen level
5. **Persist** - Saves the debate to PostgreSQL via Prisma
6. **Stream** - Sends progress updates and final result via Server-Sent Events (NDJSON)

### Pipeline Stages

| Stage | Progress | Description |
|-------|----------|-------------|
| `start` | 2% | Input validation |
| `moderate_and_retrieve` | 12% | Question moderation + source retrieval |
| `objections_and_sed_contra` | 38% | Objections and sed contra generation |
| `respondeo` | 78% | Central respondeo drafting |
| `finalize` | 94% | Output validation and structuring |
| `done` | 100% | Complete |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 4 |
| LLM | OpenAI-compatible API (OpenRouter by default) |
| Database | PostgreSQL + Prisma |
| Auth | Supabase (optional) |
| Knowledge Graph | GraphDB (SPARQL, optional) |
| i18n | In-app dictionaries (UI: ES/EN, answers: ES/EN/LA) |
| Validation | Zod |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or SQLite for local dev)
- OpenRouter API key (or any OpenAI-compatible provider)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key (OpenRouter or OpenAI) | - |
| `OPENAI_MODEL` | Primary model | `qwen/qwen3.5-9b` |
| `OPENAI_BASE_URL` | API base URL | `https://openrouter.ai/api/v1` |
| `OPENAI_FALLBACK_MODEL` | Fallback model | `openai/gpt-4o-mini-2024-07-18` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DEBATE_MAX_TOKENS` | Token limit for the full article | `4000` |
| `KNOWLEDGE_DATABASE_URL` | Neon Postgres with pgvector for semantic search | - |
| `EMBEDDING_PROVIDER=openrouter` | Embeddings via OpenRouter with the chat key (`baai/bge-m3`, multilingual) | - |
| `NEON_AI_GATEWAY_TOKEN` / `NEON_AI_GATEWAY_BASE_URL` | Embeddings via Neon AI Gateway (`qwen3-embedding-0-6b`) | - |
| `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` | Embeddings via OpenAI or any compatible API (`text-embedding-3-small`) | OpenAI URL |
| `EMBEDDING_MODEL` | Overrides the embedding model (must return 1024 dims) | per provider |

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Knowledge base (OKF)

`knowledge/` is the app's "brain": an [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format) bundle, plain markdown with YAML frontmatter, readable by people, agents and any markdown tool.

```
knowledge/
  index.md, */index.md    generated listings (OKF §8); root declares okf_version
  log.md                  change history (edit by hand)
  conceptos/              the ontology — type: Concept, SKOS-style `broader` / `related`, labels in ES/EN/LA
  cuestiones/             the Summa's 512 questions — type: Summa Question, with treatise and concepts
  articulos/              Aquinas's texts — type: Aquinas Text, `citation`, `tags` = concept ids;
                          `content: summary` (curated, AI-written) or `excerpt` (verbatim respondeo, 1920 translation)
  areas/ autores/ obras/  type: Area / Author / Work
```

**Editing:** change the frontmatter or the text above the `<!-- okf:generated:start -->` marker, then run `npm run knowledge:build`. The build validates the bundle (OKF conformance, unknown relations, `broader` cycles, citation/id mismatches), rewrites the generated sections (relations, texts per concept, backlinks), the `index.md` files, `src/data/knowledge/bundle.json` (what the app reads) and `scripts/generated/knowledge.ttl`. `npm run knowledge:check` fails if anything is out of date, and `npm test` checks it too.

**Importing the Summa:** `npm run knowledge:import` fetches every question of the Summa Theologiae from New Advent (the 1920 English Dominican translation, public domain), one request per second with a local cache in `.cache/`, and writes a question document plus one text per article with an excerpt of the respondeo. Concepts are assigned from the treatise map in `scripts/knowledge/summa-treatises.json` and from concept labels found in the titles. It never overwrites documents it did not generate (the curated summaries win). Options: `-- --parts I-II --limit 10 --delay 1000`. Then run `npm run knowledge:build`.

**Trust:** the curated summaries and concepts are AI-generated and marked `status: draft` with no `verified` field. When someone reviews a document, add `verified: { by: human:<id>, at: <ISO date> }` (and `status: stable`); the build derives the trust tier (OKF §5.3).

**Search** (`src/lib/knowledge/search.ts`) fuses with Reciprocal Rank Fusion: lexical matching (bilingual, accent- and plural-insensitive), concept labels found in the question, graph expansion to neighbouring concepts, and embeddings when available. The matched concepts' definitions are also passed to the disputation prompt.

**Embeddings (optional):** vectors live in Postgres + pgvector (`knowledge_embeddings`, 1024 dims, HNSW cosine index; schema in `scripts/knowledge/schema.sql`), reached through `KNOWLEDGE_DATABASE_URL` with the Neon serverless driver, so the app's main `DATABASE_URL` can stay where it is. Configure a provider (OpenRouter with your existing key is the simplest: `EMBEDDING_PROVIDER=openrouter`; or Neon AI Gateway, or an OpenAI-compatible key; see the table above) and run `npm run knowledge:embed`; it is incremental (content hashes), creates the schema if missing and deletes vectors of removed documents. `npm run knowledge:embed -- --dry-run` estimates tokens without calling the API (the full corpus is ~630k tokens). Without a provider or database, search runs on the lexical and graph signals only. Similarity thresholds can be tuned with `EMBEDDING_MIN_SIMILARITY` (0.35) and `EMBEDDING_MIN_CONCEPT_SIMILARITY` (0.4).

**GraphDB (optional):** `GRAPHDB_ENDPOINT_URL=... npm run knowledge:graphdb` uploads the generated TTL.

## Learning mode

`/learn` is a learning path on Aquinas's philosophy and its context: 9 modules and 19 lessons (ES/EN) in `src/data/learning/`. Each lesson has key ideas, a glossary, a primary text fetched live from the corpus (`/api/learn/source/[id]`), a quiz with explanations, questions that open a disputation (`/?q=...`) and a Socratic AI tutor (`POST /api/learn/tutor`, streamed plain text). Progress and tutor conversations are stored in the browser.

When adding a lesson, add it to both `es.ts` and `en.ts`: `src/lib/learning/curriculum.test.ts` checks that ids, quiz answers and primary texts match.

## GraphDB Setup (Optional)

The ontology engine connects to a GraphDB SPARQL endpoint to enrich debates with scholastic concepts.

### 1. Install GraphDB

Download from [Ontotext GraphDB](https://www.ontotext.com/products/graphdb/) or use Docker:

```bash
docker run -p 7200:7200 ontotext/graphdb:latest
```

### 2. Create a repository

1. Open http://localhost:7200
2. Go to **Setup → Repositories → Create repository**
3. Name it `santoTomas`
4. Choose **GraphDB Repository** type

### 3. Seed the ontology

```bash
npm run knowledge:build      # regenerates scripts/generated/knowledge.ttl from knowledge/
GRAPHDB_ENDPOINT_URL=http://localhost:7200/repositories/santoTomas npm run knowledge:graphdb
```

`scripts/ontology-seed.ttl` is the older hand-written ontology, kept for reference.

### 4. Configure the endpoint

Add to `.env.local`:

```env
GRAPHDB_ENDPOINT_URL=http://localhost:7200/repositories/santoTomas
```

## Testing

```bash
npm test           # Run all tests
npm run test:watch # Watch mode
npm run test:coverage  # Coverage report
```

Test coverage includes:
- JSON parsing and extraction
- Zod schema validation (DebateInput, DebateOutput, SourceSnippet)
- Error class hierarchy
- withRetry utility
- Markdown export with frontmatter
- Question scope guardrail

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/debate/               # API routes
│   │   ├── process/route.ts      # Main streaming endpoint
│   │   ├── [id]/route.ts         # Get debate by ID
│   │   ├── [id]/export/route.ts  # Export as Markdown
│   │   └── history/route.ts      # List debate history
│   ├── HomePageClient.tsx        # Main UI component
│   └── useDebateManager.ts       # Client state management
├── lib/
│   ├── agents/                   # LLM agent implementations
│   │   ├── moderator.ts          # Question moderation
│   │   ├── scholasticDebate.ts   # Single-pass debate generation
│   │   └── OntologyEngine.ts     # GraphDB SPARQL client
│   ├── orchestrator/             # Pipeline orchestration
│   │   └── runDebate.ts          # Main debate runner
│   ├── llm/                      # LLM utilities
│   │   ├── client.ts             # OpenAI client setup
│   │   ├── callModel.ts          # Model calling with fallback
│   │   ├── parseJson.ts          # JSON extraction from LLM output
│   │   └── withRetry.ts          # Retry with backoff
│   ├── retrieval/                # Source retrieval
│   │   ├── aquinasRetriever.ts   # Local corpus + web localization
│   │   └── ontologyRetriever.ts  # Ontology-enriched retrieval
│   ├── prompts/                  # System prompts
│   ├── schemas/                  # Zod validation schemas
│   ├── db/                       # Database operations
│   └── export/                   # Markdown export
├── components/                   # React components
├── data/                         # Static corpus and content
└── types/                        # TypeScript type definitions
```

## Deployment

### Vercel

```bash
npm run vercel-build
```

The `vercel-build` script runs `prisma generate` before building.

### Database

For production, use PostgreSQL. The schema includes:
- `Debate` table with `userId` for multi-tenant support
- `SourceLocalization` table caching ES/LA source translations
- JSON columns for `objections`, `replies`, and `sources`

### Auth & privacy

Supabase auth is optional. When configured (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`):
- Signed-in users get debates saved under their `userId`; the history sidebar shows only their own debates.
- Anonymous debates are stored under the `legacy` user and are accessible only by direct ID.
- Without a session, the history endpoint returns an empty list with `requiresAuth: true`.

### Rate limiting

Per-IP rate limits use Upstash Redis (REST) when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set; otherwise an in-memory, per-instance fallback is used.

---

Made with ♥ by [jpviola](https://www.jpviola.com)
