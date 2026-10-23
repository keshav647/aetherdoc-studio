# AetherDoc Studio — Universal Document Intelligence & Human-in-the-Loop Verification Platform

<div align="center">

<img src="public/logo.png" alt="AetherDoc Studio Logo" width="112" height="112" style="border-radius: 22px;" />

### **Enterprise-Grade Multi-Format Document Extraction, Interactive Bounding-Box Auditing, Multi-Cloud Object Storage Ingestion, and Bi-Directional Supabase Sync**

[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5.6](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com/)
[![Loom Walkthrough](https://img.shields.io/badge/Loom_Walkthrough-1080p_HD-625DF5?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44)
[![Author](https://img.shields.io/badge/Author-Keshav_Budhiraja-0EA5E9?style=for-the-badge&logo=github)](https://github.com/keshav647)

</div>

---

## 🎬 Architecture Tour & Live Video Walkthrough

> **Watch the full 1080p architecture tour and live product demonstration on Loom:**  
> [![Watch AetherDoc Studio Architecture & Live Walkthrough on Loom](https://img.shields.io/badge/Watch_Full_Walkthrough-Loom_HD-625DF5?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44)  
> *Direct Link:* [https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44](https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44)  
> *For the step-by-step evaluation guide and reviewer checklist, see [Technical Walkthrough & Evaluation Guide](docs/WALKTHROUGH.md).*

---

## 1. Why We Need This Project

Organizations across finance, legal, healthcare, recruitment, and enterprise operations process thousands of unstructured documents daily—ranging from **commercial invoices** and **master service agreements (MSAs)** to **multi-page resumes/CVs**, **balance sheets**, **tax filings**, and **compliance audit statements**.

Traditional OCR and document extraction tools fail in modern workflows for four fundamental reasons:

1. **Rigid, Single-Domain Templates**: Legacy parsers are hardcoded for a single document type (e.g., only invoices with fixed `Subtotal` / `Tax` / `Total` fields). As soon as a team uploads a resume, legal contract, or medical record, hardcoded category schemas break down or misclassify critical data.
2. **Black-Box AI Hallucinations Without Visual Proof**: Pure LLM wrappers return raw JSON blobs without linking extracted values back to their exact visual coordinates on the page. Auditors have no way to verify *where* on Page 2 or Page 3 a figure came from, nor can they draw, resize, or delete bounding boxes when an extraction needs human correction.
3. **Cloud & Vendor Lock-In**: Most SaaS document platforms lock users into a single proprietary LLM and a single cloud storage silo, preventing teams from bringing their own API keys (**BYOK**) or pulling documents directly from their existing **Cloudflare R2**, **AWS S3**, **Azure Blob Storage**, **Google Cloud Storage**, or **Supabase PostgreSQL** infrastructure.
4. **No Offline / Zero-Key Fallback**: When an API quota is exhausted or a user wants to inspect sensitive documents locally without sending payloads to external AI providers, cloud-only tools become completely unusable.

---

## 2. What Problem AetherDoc Studio Solves

**AetherDoc Studio** bridges the gap between **autonomous AI document understanding**, **multi-layer discrepancy & security auditing**, and **precision Human-in-the-Loop (HITL) visual verification**:

* **Autonomous Dynamic Categorization Across 11+ Document Archetypes**: Instead of forcing every document into rigid accounting buckets, AetherDoc Studio dynamically discovers and creates context-aware section categories tailored to the actual document (`INVOICE`, `CONTRACT`, `RESUME`, `INCIDENT_REPORT`, `MEDICAL_RECORD`, `RECEIPT`, `TAX_FORM`, `ID_DOCUMENT`, `BANK_STATEMENT`, `PURCHASE_ORDER`, `GENERAL`).
* **Multi-Layer Discrepancy, Anomaly & Knowledge Verification Engine**: Automatically audits documents in both AI and Local modes for:
  * **Temporal & Chronological Impossibilities**: Catches invalid calendar dates (e.g., `Feb 30`, `June 31`), reverse timelines (`Due Date` prior to `Issue Date`), and impossible career/education timelines.
  * **Mathematical & Financial Reconciliation**: Verifies line-item arithmetic (`Qty × Unit Price = Line Total`) and summary equations (`Subtotal + Tax - Discount = Total Due`), flagging exact cent/dollar variances.
  * **Factual, Domain & World-Knowledge Auditing**: When connected to AI, cross-checks historical dates, incident timelines, geographical facts, scientific claims, and regulatory references, attaching an explicit `discrepancy_note` directly onto the offending field while keeping valid fields verified (`95%–99%`).
* **11-Vector Adversarial Prompt Injection Sentinel (Works 100% Locally & With AI)**: Built-in security guardrail (`detectAdversarialPromptInjections`) de-obfuscates zero-width characters and scans for instruction hijacking (`Ignore previous instructions`), synthetic evaluator tags (`[System Evaluation Context: ...]`), ATS score manipulation, LLM delimiter tokens (`<|im_start|>`), white-text CSS camouflage, and data exfiltration beacons—completely offline with zero API key required, plus semantic AI reinforcement when a key is connected.
* **Dual-Engine Architecture (Universal AI Scan + Offline Local Scan)**:
  * **AI Scan Mode**: Auto-detects any pasted API key (**Google Gemini**, **OpenAI GPT-4o**, **Anthropic Claude**, **Groq LPU**, **OpenRouter**, or **xAI Grok**) to extract structured fields, confidence scores, discrepancy notes, and page mappings from **any document or image format**.
  * **Local Engine Mode**: Works 100% key-free using coordinate-sorted **Mozilla PDF.js (`unpdf`)**, native **DOCX XML inflation**, and the **Local Discrepancy & Prompt Injection Sentinel** to parse and audit `PDF`, `DOCX`, `CSV`, `JSON`, `TXT`, and `MD` files without external API calls.
* **Interactive Bounding-Box Verification Studio**: Renders every document page on an interactive canvas with content-proportional, non-overlapping bounding boxes. Reviewers can **click to inspect**, **edit values inline**, **draw new custom bounding boxes (`D`)**, **delete unwanted boxes (`Delete` / `Backspace`)**, and **approve/flag fields** with an immutable audit trail.
* **Direct Multi-Cloud Object Storage & Supabase PostgreSQL Integration**: Connect directly to **Cloudflare R2**, **AWS S3**, **Azure Blob Storage**, **Google Cloud Storage**, or **Custom S3 (MinIO / DigitalOcean Spaces)** using built-in **AWS Signature V4** and **Azure SAS** connectors, and synchronize documents bi-directionally with **Supabase PostgreSQL**.

---

## 3. System Architecture & End-to-End Workflow

```mermaid
flowchart TB
    subgraph Sources["1. Multi-Source Document Ingestion"]
        LocalUpload["Local Drag & Drop Upload\n(PDF, DOCX, CSV, JSON, TXT, MD, Images)"]
        CloudStorage["Cloud Object Storage Connectors\n(Cloudflare R2, AWS S3, Azure Blob, Google GCS, Custom S3)"]
        SupabasePull["Supabase PostgreSQL Sync\n(Bi-Directional Push & Pull)"]
    end

    subgraph Engine["2. Dual-Engine Extraction, Security & Discrepancy Audit"]
        PreFlight["Pre-Upload Confirmation & Source Inspector"]
        Router{"Active Extraction Mode"}
        AIScan["Universal AI Engine (/api/gemini)\nDynamic Category Discovery & Factual/Math/Date Audit"]
        LocalScan["Coordinate-Sorted Local Engine (/api/extract)\nMozilla PDF.js (unpdf) + Native DOCX XML Parser"]
        Sentinel["Discrepancy & Prompt Injection Sentinel\n11-Vector Injection Guardrail • Math & Timeline Validator"]
        Calibrator["Proportional Layout Calibrator\nTrue Physical Page Mapping & Non-Overlapping BBox Engine"]
    end

    subgraph Studio["3. Human-in-the-Loop (HITL) Verification Studio"]
        Canvas["Interactive Multi-Page Document Canvas\nZoom • Pan • Draw Custom Box (D) • Delete Box (Del)"]
        Ledger["Dynamic Category Field Ledger\nDiscrepancy Callouts • Inline Override • Batch Sign-Off"]
        Audit["Immutable Audit Trail & Hybrid Search Index"]
    end

    LocalUpload --> PreFlight
    CloudStorage --> PreFlight
    SupabasePull --> Calibrator
    PreFlight --> Router
    Router -->|"AI Scan (BYOK)"| AIScan
    Router -->|"Local Scan (No Key Required)"| LocalScan
    AIScan --> Sentinel
    LocalScan --> Sentinel
    Sentinel --> Calibrator
    Calibrator --> Canvas
    Calibrator --> Ledger
    Canvas <--> Ledger
    Ledger --> Audit
    Audit --> SupabasePull
```

---

## 4. Comprehensive Tech Stack Explanation

Every technology in **AetherDoc Studio** was selected to maximize extraction accuracy, visual responsiveness, and zero-lock-in extensibility:

### Frontend & Interactive Studio Layer
| Technology | Version | Why We Use It & Role in the Architecture |
| :--- | :--- | :--- |
| **Next.js (App Router)** | `15.1.0` | Provides unified React Server Components, client-side interactive studio routes (`/documents/[id]`), and serverless Node.js API endpoints (`/api/gemini`, `/api/storage`, `/api/extract`, `/api/export/[id]`) in a single cohesive runtime. |
| **React 19 (`useSyncExternalStore`)** | `19.0.0` | Powers the zero-latency reactive state store (`AppStoreManager`), synchronizing bounding box selections, inline field edits, and confidence telemetry across the canvas and ledger at 60 FPS without unnecessary re-renders. |
| **TypeScript** | `5.6.3` | Enforces end-to-end type safety across normalized bounding box coordinates (`NormalizedBBox`), multi-cloud storage configurations (`CloudStorageConfig`), extracted field schemas (`ExtractedField`), and audit logs (`AuditLog`). |
| **Tailwind CSS** | `3.4.16` | Implements the **Liquid Glass Design System**—combining deep obsidian surfaces (`#07090E`), translucent glassmorphic panels, tabular numeric telemetry (`tabular-nums`), and official cloud brand themes. |
| **Framer Motion & GSAP** | `11.15` / `3.15` | Drives smooth micro-interactions, modal transitions, bounding-box focus animations, and landing page choreography. |
| **Lucide React** | `0.468.0` | Supplies crisp, accessible vector iconography across the verification studio, cloud storage selectors, and telemetry cards. |

### Document Parsing, AI Orchestration & Cloud Infrastructure Layer
| Technology | Version | Why We Use It & Role in the Architecture |
| :--- | :--- | :--- |
| **Mozilla PDF.js (`unpdf`)** | `1.7.0` | Executes serverless coordinate-aware PDF text extraction in `/api/extract`. Groups text tokens by visual `(Y, X)` coordinates (`3.5pt` tolerance) so multi-column layouts, tables, and headers are reconstructed in natural human reading order. |
| **Native DOCX XML Inflator (`zlib`)** | Node Built-in | Parses `.docx` OpenXML archives directly in memory by locating and inflating `word/document.xml` without heavy external binary dependencies. |
| **Multi-LLM Universal Gateway (`/api/gemini`)** | Custom REST | Auto-detects API keys by prefix (`AIza...`, `sk-...`, `sk-ant-...`, `gsk_...`, `sk-or-...`, `xai-...`), dynamically queries Google's `/v1beta/models` endpoint to verify enabled Gemini Flash models, and includes automatic truncated-JSON recovery (`recoverTruncatedJson`). |
| **Discrepancy & Injection Sentinel (`discrepancyDetector.ts`)** | Custom Engine | Performs deterministic local checks for impossible calendar dates, chronological inversions, subtotal/tax/total math mismatches, internal contradictions, and 11 adversarial prompt injection vectors. |
| **Zero-Dependency AWS Signature V4 Engine (`/api/storage`)** | Node `crypto` | Implements cryptographic `AWS4-HMAC-SHA256` request signing from scratch using Node's native `crypto` module, enabling direct `ListObjectsV2` and `GetObject` calls to **Cloudflare R2**, **AWS S3**, **Google Cloud Storage**, and **MinIO** without bloated SDK bundles. |
| **Supabase (`@supabase/supabase-js`)** | `2.47.10` | Provides cloud PostgreSQL persistence with Row Level Security (RLS), bi-directional document/field synchronization (`pull`, `push`, `both`), and dual-schema fallback compatibility. |

---

## 5. Key Features in Detail

### A. Dual-Engine Extraction, Dynamic Categories & Discrepancy Auditing
- **Explicit Mode Selector in Studio Header**: Switch between **AI Scan** and **Local Scan** directly from the top toolbar of the Document Verification Studio.
- **Autonomous Category Discovery**: Dynamically creates 4 to 8 human-readable categories tailored to the document's domain (e.g., *Incident Summary & Classification*, *Chronological Timeline & Location*, *Root Cause & Corrective Actions* for an Incident Report).
- **Precision Discrepancy Detection Without False-Positive Contamination**:
  - Valid, accurate fields are scored `0.95–0.99` (`verified` / Emerald Green).
  - Fields containing math errors, impossible dates, timeline contradictions, or factual inaccuracies are scored `0.15–0.45` (`flagged` / Crimson Red) with an inline **Discrepancy Audit Callout (`discrepancy_note`)** explaining the exact error and expected correction.
- **11-Vector Prompt Injection Guardrail (Offline + AI)**: Detects hidden instructions, ATS score tampering, jailbreak personas, LLM control tokens, and white-text CSS exploits both locally (without an API key) and via AI.

### B. Dynamic Multi-Page Layout & Bounding Box Studio
- **True Physical Page-Count Calibration**: Strictly respects the physical page count of uploaded documents (`1..N` pages) without artificially splitting single-page documents across extra virtual pages.
- **Content-Proportional Bounding Boxes**: Calculates vertical box heights proportionally to the text length of each extracted field so boxes never collide or clip multiline paragraphs.
- **Full CRUD on Bounding Boxes**:
  - **Add Custom Box (`D`)**: Click **Draw Custom Box** (or press `D`) and drag anywhere on the document canvas to create a new custom field with live coordinate binding.
  - **Delete Any Box (`Delete` / `Backspace`)**: Remove any custom or extracted field box directly from the floating bounding-box toolbar on the canvas, the trash icon on any Field Card in the right-hand ledger, or via keyboard shortcut (`Delete` / `Backspace`).
  - **Inline Override & Approval (`A` / `E` / `F`)**: Approve fields (`A`), edit values inline (`E`), flag anomalies (`F`), or batch-verify an entire document in one click.
- **Instant Memory Wipe & Upload Redirection**: Clicking **Clear Memory** from any screen wipes cached documents and storage state and immediately redirects to the **Upload & Document Dashboard (`/dashboard`)** for a clean workspace start.

### C. Branded Multi-Cloud Object Storage & Supabase Sync
- **Official Cloud Brand Themes**: Dedicated, color-calibrated storage connectors for:
  - **Cloudflare R2** (`#F38020` Cloudflare Orange)
  - **Amazon S3** (`#FF9900` AWS Amber Gold)
  - **Azure Blob Storage** (`#0078D4` Azure Blue)
  - **Google Cloud Storage** (`#4285F4` Google Royal Blue + 4-color accents)
  - **Custom S3 / MinIO / DigitalOcean Spaces** (`#8B5CF6` Violet)
- **Search & Import Before Ingestion**: Browse or search remote cloud buckets and Supabase PostgreSQL tables, inspect file metadata in the **Document Confirmation Modal**, and import documents directly into the verification queue.

---

## 6. Modular Codebase Structure

```text
├── app/
│   ├── (auth)/                 # Authentication & workspace onboarding flows
│   ├── (dashboard)/
│   │   ├── dashboard/          # Telemetry KPIs, Ingestion Dropzone & Verification Queue
│   │   ├── documents/          # Document Vault & Interactive HITL Verification Studio ([id])
│   │   ├── search/             # Hybrid Document, Field & Excerpt Search Engine
│   │   └── settings/           # Supabase Sync, Universal AI Key & Confidence Thresholds
│   └── api/
│       ├── extract/route.ts    # Coordinate-sorted PDF (unpdf) & DOCX server extraction
│       ├── gemini/route.ts     # Multi-LLM verification, dynamic categories & discrepancy audit
│       ├── storage/route.ts    # AWS SigV4 (R2/S3/GCS/MinIO) & Azure Blob storage proxy
│       ├── search/route.ts     # Hybrid full-text & field search endpoint
│       └── export/[id]/route.ts# Audited JSON payload export endpoint
├── components/
│   ├── common/                 # CloudStorageModal, SupabaseSyncModal, ByokModal, DocumentConfirmModal
│   ├── dashboard/              # IngestionDropzone, TelemetryGrid, VerificationQueueTable
│   ├── landing/                # HeroSection, ArchitectureBento, ProductShowcase
│   ├── layout/                 # GlobalHeader, SidebarNav
│   └── studio/                 # StudioHeader, PdfCanvasViewer, DocumentPageRenderer,
│                               # BoundingBoxLayer, FieldLedger, FieldCard, AuditDrawer
├── lib/
│   ├── extraction/
│   │   ├── types.ts               # Core TypeScript interfaces & data contracts
│   │   ├── providerDetector.ts    # API key sanitization & multi-LLM provider auto-detection
│   │   ├── discrepancyDetector.ts # Local math, date, contradiction & prompt injection auditor
│   │   ├── layoutCalibrator.ts    # Content-proportional bounding box & true page layout engine
│   │   ├── localFileParsers.ts    # Client/server PDF, DOCX, CSV, JSON, MD, TXT parsers
│   │   ├── prompt-schemas.ts      # Zod validation schemas & structured AI system instructions
│   │   └── universalExtractor.ts  # Unified AI + Local extraction & 11-vector injection sentinel
│   ├── storage/
│   │   └── cloudProviders.ts   # Cloud provider brand tokens, MIME helpers & S3 URL builder
│   └── supabase/
│       ├── schema.sql          # Idempotent PostgreSQL schema + RLS policies
│       ├── client.ts           # Data store & Supabase client adapter
│       └── mock-data.ts        # Built-in evaluation documents & fields
├── store/
│   └── useAppStore.ts          # Reactive workspace store with localStorage & Supabase sync
└── supabase/
    └── schema.sql              # Production Supabase SQL migration script
```

---

## 7. Quickstart & Local Setup

### Prerequisites
- **Node.js** `>= 18.17.0`
- **npm** `>= 9.0.0`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/keshav647/aetherdoc-studio.git
cd aetherdoc-studio
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Optional: Connect AI API Key, Cloud Storage, or Supabase
- **Local Scan works immediately out of the box** with zero configuration for `PDF`, `DOCX`, `CSV`, `JSON`, `TXT`, and `MD` files.
- **To enable AI Scan**: Click **AI Engine** in the top header and paste a **Google Gemini** (`AIza...`), **OpenAI** (`sk-...`), **Anthropic Claude** (`sk-ant-...`), **Groq** (`gsk_...`), **OpenRouter** (`sk-or-...`), or **xAI Grok** (`xai-...`) key.
- **To enable Cloud Object Storage**: Click **Connect Cloud Storage** and select **Cloudflare R2**, **AWS S3**, **Azure Blob**, **Google Cloud Storage**, or **Custom S3**.
- **To enable Supabase Sync**: Click **Supabase Sync** in the header, copy the **Quickstart SQL Schema** (or run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor), and enter your Project URL and Anon Public Key.

---

## 8. Author & Maintainer

**Keshav Budhiraja**
* Systems & AI Engineer
* **GitHub:** [@keshav647](https://github.com/keshav647)
* **Portfolio:** [keshavbudhiraja.com](https://keshavbudhiraja.com)
* **Email:** [keshavbudhiraja4321@gmail.com](mailto:keshavbudhiraja4321@gmail.com)

---

## License

MIT © [Keshav Budhiraja](https://github.com/keshav647). All rights reserved.
