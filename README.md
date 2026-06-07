# Foundry AI ⚡️

**Foundry AI** is a fully autonomous, production-grade multi-agent orchestrator that transforms raw venture concepts into comprehensive business blueprints. Built on a resilient, typed TypeScript architecture, it employs a "CEO to Subagent" delegation model powered by ultra-fast **Groq LPUs** (Llama 3.3 70B & Llama 3.1 8B).

![Foundry AI Dashboard](https://img.shields.io/badge/UI-Neo--Brutalist-brightgreen) ![Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-blue) ![LLM](https://img.shields.io/badge/Powered%20by-Groq-orange)

## 🚀 Key Features

- **Parallel Agent Orchestration:** A `CEO-Parent` agent concurrently delegates tasks to four highly specialized subagents (`Research`, `Product`, `Engineering`, `Finance`) in a single execution turn, drastically reducing total generation time.
- **60+ Context-Isolated Tools:** Tools are strictly typed using `zod` and partitioned into isolated subagent registries to prevent context pollution and hallucination.
- **High-Fidelity Research Engine:** The `research-subagent` utilizes DuckDuckGo HTML scraping with Wikipedia API fallbacks and an intelligent query simplifier (stripping marketing jargon) to source real-world market competitors. If search yields generic results, it seamlessly falls back to its core LLM training knowledge to extract verified market leaders.
- **Enterprise Neo-Brutalist Dashboard:** A highly interactive Next.js 16 frontend featuring live-updating SVG architecture flowcharts, real-time blueprint rendering, and a striking high-contrast aesthetic.
- **Production Hardened Execution:** Built-in exponential backoff for rate-limits, intelligent LLM JSON structuring, and strict prompt adherence rules.

## 🧠 System Architecture

The application is structured as a Turborepo monorepo:

- **`apps/web`**: Next.js App Router application serving the Enterprise Dashboard. Features custom Framer Motion-style interval animations for the SVG system flowchart.
- **`apps/agent-api`**: NestJS backend exposing REST endpoints for the orchestrator. Initializes the LLM providers and defines the strict prompt hierarchies.
- **`packages/agent-core`**: The foundational execution loop. Contains the `Agent` and `DelegateTool` classes that handle sub-run tracking and context management.
- **`packages/tools-*`**: Five distinct NPM packages housing 60+ tools spanning across System, Research, Product, Engineering, and Finance namespaces.

## 🛠 Getting Started

### Prerequisites
- Node.js (v18+)
- A [Groq API Key](https://console.groq.com/)

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Start the Backend API:**
   ```bash
   npm run start:dev --workspace=agent-api
   ```

4. **Start the Frontend Dashboard:**
   In a new terminal window:
   ```bash
   npm run dev --workspace=web
   ```

5. **Run the App:**
   Open `http://localhost:3000` in your browser. Enter a venture concept (e.g., *"A Rust-based serverless edge computing platform for low-latency WebAssembly microservices"*) and watch the multi-agent system design your blueprint!

## 🧪 Evaluation & Accuracy

Foundry AI utilizes an internal grading metric that verifies blueprints against 5 critical success criteria:
1. All 5 Domain Namespaces Covered
2. Tiered Pricing Strategy Established
3. Monthly OPEX Estimation Calculated
4. Technical Modules Architecture Defined
5. Market Competitors Accurately Identified

## 📄 License
UNLICENSED - Built by Subhranil Mondal
