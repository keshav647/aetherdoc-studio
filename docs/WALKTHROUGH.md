# AetherDoc Studio // Live Video Walkthrough & Technical Evaluation Guide

<div align="center">

[![Loom Walkthrough](https://img.shields.io/badge/Loom_Walkthrough-1080p_HD-625DF5?style=for-the-badge&logo=loom&logoColor=white)](https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5.6](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com/)

</div>

This document provides technical leads, hiring managers, and reviewers with a comprehensive guide to evaluating **AetherDoc Studio — Universal Document Intelligence & Human-in-the-Loop (HITL) Verification Platform**, including the full 1080p Loom architecture walkthrough and a step-by-step local verification checklist.

---

## 🎬 1. Full HD Video Walkthrough

Watch the complete architecture tour and live product demonstration on Loom:

👉 **[Watch AetherDoc Studio Architecture & Live Walkthrough on Loom](https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44)**  
*(Direct URL: `https://www.loom.com/share/120b706a43a540e492c76709fe7a9b44`)*

### Walkthrough Demonstrates:
1. **The Modern Verification Dashboard (`/dashboard`):** Real-time ingestion dropzone, document statistics, verification queue, and KPI metrics.
2. **Multi-Source Ingestion:** Drag-and-drop file upload (`PDF`, `DOCX`, `CSV`, `JSON`, `TXT`, `MD`, images) alongside direct connectors for **Cloudflare R2**, **AWS S3**, **Azure Blob**, **Google Cloud Storage (GCS)**, **MinIO / Custom S3**, and bi-directional **Supabase PostgreSQL** sync.
3. **Multi-Tier Discrepancy & Factual Auditing:**
   - **Verified Clean Data (Green / 95%–99% confidence):** Correct vendor metadata, addresses, tax IDs, and remittance details.
   - **Math & Line-Item Discrepancies (Red / 35% confidence):** Catches calculation errors (e.g. `5 x $20.00 = $250.00` instead of `$100.00`), highlighting exact cent/dollar variances.
   - **Critical Data & Calendar Impossibilities (Dark Red / 5% confidence):** Catches non-existent dates (e.g. `February 30, 2027`) and chronological reversals with high-visibility audit callout banners.
4. **11-Vector Adversarial Prompt Injection Guardrail:** Offline scanning for instruction hijacking, synthetic system evaluator tags, ATS manipulation tokens, and invisible zero-width characters.
5. **Interactive Bounding-Box Verification Studio:** True physical page mapping, content-proportional bounding boxes, inline field editing (`E`), custom box drawing (`D`), and deletion (`Delete` / `Backspace`).
6. **Dual-Engine Architecture:** Instant key-free local extraction with coordinate-sorted **Mozilla PDF.js (`unpdf`)** and **native DOCX XML**, plus universal multi-LLM BYOK support across Google Gemini, OpenAI, Claude, Groq, and OpenRouter.

---

## 🏛️ 2. Core Architectural Signals

* **Dynamic Archetype Discovery:** Rather than forcing documents into rigid fixed templates, AetherDoc dynamically detects categories across 11+ document archetypes (`INVOICE`, `CONTRACT`, `RESUME`, `INCIDENT_REPORT`, `MEDICAL_RECORD`, `RECEIPT`, `TAX_FORM`, etc.).
* **Zero-Hallucination Visual Binding:** Every extracted value is mapped to exact canvas coordinates with content-proportional bounding boxes.
* **100% Offline / Zero-Key Local Fallback:** Full document parsing and discrepancy auditing without requiring external API calls or exposing confidential files to third parties.
* **Multi-Cloud Storage & PostgreSQL Sync:** Production AWS Signature V4 and Azure SAS authentication for zero-lock-in enterprise ingestion.

---

## 🧪 3. Step-by-Step Local Evaluation Guide

Reviewers can spin up and verify AetherDoc Studio locally in under 60 seconds:

### Step 1: Start the Development Server
```bash
cd "/Users/keshavbudhiraja/full stack "
npm run dev
```
Navigate to `http://localhost:3000` (or `http://localhost:3001`).

### Step 2: Test Discrepancy Auditing with Enterprise Test Document
1. Navigate to `/dashboard`.
2. Drag and drop `enterprise_audit_test_document.pdf` into the ingestion dropzone (or select Local Engine Mode).
3. Open the document in the **Verification Studio**:
   - Observe **Green Bounding Boxes (98%–99%)** for verified vendor identity and wire details.
   - Observe **Red Discrepancy Callout (35%)** on Line Item 3 calculation error (`5 x $20.00 = $250.00`).
   - Observe **Dark Red Critical Violation Banner (5%)** on Section V Warranty Attestation (`February 30, 2027` calendar impossibility).

### Step 3: Test Interactive Bounding-Box Controls
* Press **`D`** to enter custom box drawing mode and drag a new box on the page canvas.
* Select any box and press **`Delete`** or **`Backspace`** to remove it.
* Click **Approve (`A`)** or **Edit (`E`)** to update field values with real-time audit ledger sync.

### Step 4: Test Universal BYOK Gateway
* Click **AI Engine** in the top navigation bar.
* Paste any API key (**Google Gemini**, **OpenAI GPT-4o**, **Anthropic Claude**, **Groq**, or **OpenRouter**) — AetherDoc auto-detects the provider and model family.

---

## 📊 4. Discrepancy & Security Benchmark Matrix

| Validation Vector | Standard OCR Parsers | AetherDoc Studio Engine |
| :--- | :--- | :--- |
| **Arithmetic Line-Item Reconciliation** | Blindly copies wrong totals | **Flags variance with cent-level error note** |
| **Calendar & Chronological Integrity** | Accepts non-existent dates | **Flags invalid dates (`Feb 30`) and reverse timelines** |
| **Adversarial Prompt Injections** | Vulnerable to system prompt overrides | **11-vector offline de-obfuscation & detection** |
| **Visual Bounding-Box Coordination** | Black-box JSON response | **Content-proportional true physical page canvas** |
| **API Failure / Offline Handling** | Total outage | **100% functional local parser (unpdf + DOCX XML)** |

---

## 👤 Author & Maintainer

**Keshav Budhiraja**
* Systems & AI Engineer
* **GitHub:** [@keshav647](https://github.com/keshav647)
* **Portfolio:** [keshavbudhiraja.com](https://keshavbudhiraja.com)
* **Email:** [keshavbudhiraja4321@gmail.com](mailto:keshavbudhiraja4321@gmail.com)
