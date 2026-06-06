# Foundry AI - Implementation Plan

## Overview
This implementation plan breaks down the 12 phases of Foundry AI into a strict 5-day schedule to meet the hackathon requirements. The system must be production-ready, featuring an autonomous agent orchestrating multiple specialized subagents with at least 50 tools across 4 namespaces.

## Day 1: Foundation & Agent Runtime (Today's Focus)
**Objective:** Setup the monorepo, define the core agent execution loop, and build the tool registry. 
**Phases Covered:** 1 (Foundation), 2 (Agent Runtime), 3 (Tool Registry)

### Tasks:
1. **Repository Setup:**
   - Initialize Turborepo with NestJS backend, Next.js frontend, and shared packages.
   - Setup PostgreSQL and Redis using Docker Compose.
   - Configure Prisma ORM and generate initial schema for agent runs and logs.
2. **Core Agent Runtime:**
   - Implement the generic `Agent` class in NestJS.
   - Integrate an LLM provider (e.g., OpenAI or Anthropic).
   - Build a robust execution loop capable of iterative tool calling.
3. **Tool Registry & Base Tools:**
   - Create a typed `ToolRegistry` that dynamic loads tools based on namespaces.
   - Define the `BaseTool` interface with composable inputs/outputs.
   - Implement Namespace 1: `System` (e.g., ReadFile, WriteFile, Search).

---

## Day 2: Subagents & Initial Workflows
**Objective:** Implement context-isolated subagents and the first domain-specific workflows.
**Phases Covered:** 4 (Subagents), 5 (Research Workflow), 6 (Product Workflow)

### Tasks:
1. **Subagent Orchestration:**
   - Create a specific subagent tool that spins up a completely isolated context (no shared memory with parent).
   - Implement strict structured output returns to the parent (CEO Agent).
2. **Market Research Agent (Namespace 2: `Research`):**
   - Implement tools: WebSearch, ScrapeURL, AnalyzeMarketTrends, CompetitorAnalysis.
   - Assemble tools into composable chains.
3. **Product Manager Agent (Namespace 3: `Product`):**
   - Implement tools: DefineRequirements, WriteUserStories, DesignWireframeSpec.

---

## Day 3: Advanced Workflows & Memory
**Objective:** Complete the required 50+ tools, long-horizon memory, and remaining workflows.
**Phases Covered:** 7 (Technical Workflow), 8 (Business Workflow), 9 (Memory)

### Tasks:
1. **Long-Horizon Execution (Memory):**
   - Implement state management using Redis/Postgres to prevent plan coherence loss over 20+ tool calls.
   - Add summary/context-window management logic.
2. **Staff Engineer Agent (Namespace 4: `Engineering`):**
   - Implement tools: ArchitectSystem, SelectTechStack, ScaffoldRepository.
3. **Finance Agent (Namespace 5: `Finance`):**
   - Implement tools: BuildFinancialModel, EstimateCosts, PriceStrategy.
4. **Tool Expansion:**
   - Ensure the total unique tools reach 50+ across the namespaces, all model-driven.

---

## Day 4: Production Hardening & Evaluation
**Objective:** Meet the strict production scaffolding requirements of the brief.
**Phases Covered:** 10 (Production Hardening), 11 (Evaluation Harness)

### Tasks:
1. **Observability:**
   - Instrument the code with OpenTelemetry for tracing agent decisions and subagent spawns.
2. **Resilience:**
   - Implement typed error handling.
   - Add retries with exponential backoff for all external API calls.
   - Setup rate-limiting wrappers for tool execution.
3. **Testing & Eval:**
   - Write comprehensive Unit Tests for tools and agent logic.
   - Implement an Evaluation Harness to programmatically grade the agent's output against a gold standard.

---

## Day 5: E2E Polish & Submission
**Objective:** Ensure the full blueprint generation completes successfully in one session and prepare the MEMO.
**Phases Covered:** 12 (Demo Polish)

### Tasks:
1. **Integration Testing:**
   - Run the CEO Agent to generate a full venture blueprint end-to-end.
   - Verify the 20+ continuous tool call requirement holds.
2. **Demo Polish:**
   - Finish the Next.js UI to visualize the agent's real-time execution, subagent spawns, and final blueprint.
3. **Documentation:**
   - Write the required 1-page `MEMO.md`.
   - Final review against all hackathon brief constraints.
