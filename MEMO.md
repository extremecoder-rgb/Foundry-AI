# Foundry AI - Venture Studio Agent
**Candidate:** Subhranil Mondal

## What I Built
I built **Foundry AI**, a production-grade multi-agent orchestrator that synthesizes raw startup concepts into structured venture blueprints (financial models, engineering architecture, product requirements, and market research). The system leverages a "CEO-Parent" agent that delegates tasks to four context-isolated subagents. It includes 60+ typed tools across 5 namespaces, exponential backoff retries on LLM inference, native OpenTelemetry integration, and a Neo-Brutalist Next.js dashboard featuring a real-time, SVG-animated system architecture flowchart.

## What I Cut
I originally planned to build an interactive chat interface where the user could debate the subagents on their specific outputs (e.g., arguing with the Finance agent about pricing). I cut this to focus entirely on the depth and stability of the autonomous orchestration loop. I also cut live database migrations for the generated architecture schemas, as simulating the environment was sufficient for the blueprint scope without risking arbitrary execution context breaks.

## What Additional Time Would Have Addressed
With more time, I would have implemented a "Memory Stream" database (using pgvector) to allow the CEO-Parent agent to recall successful architectural patterns from past venture blueprints. Currently, the system builds each venture from a blank slate. Additionally, I would have added a WebSocket layer to stream the subagents' internal "Thought" reasoning directly to the Next.js dashboard in real-time, rather than waiting for the final JSON artifact to render the UI.

## Defending a Design Decision
**Decision: Running subagents in strict parallel using isolated JSON prompts rather than a shared context window.**

An engineer might reasonably argue for a shared context window (e.g., a "whiteboard" pattern) where the Research, Product, and Finance agents all append to the same message thread, allowing them to see each other's work natively. 

I explicitly chose against this and built strictly isolated `AgentContext` runtimes for each subagent, managed by `delegate_to_*` tools. 

**Defense:**
1. **Context Collapse:** A shared whiteboard quickly dilutes the model's attention. If the Engineering agent sees 40 paragraphs of the Finance agent's OPEX rambling, it severely degrades its ability to accurately output clean, functional architecture schemas.
2. **Speed:** By isolating the contexts, the CEO-Parent agent can invoke all four subagents via `Promise.all()` in a single turn. This reduces generation time from ~45 seconds (sequential) to ~12 seconds (parallel).
3. **Tool Registry Coherence:** Injecting 60+ tools into a single shared session would cause tool-selection paralysis. By isolating contexts, the Research agent only sees the 10 web/scraping tools, while the Finance agent only sees the 10 calculator tools. This guarantees high-fidelity tool selection without collapsing into a conditional dispatch nightmare.
