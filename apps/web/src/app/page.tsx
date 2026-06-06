'use client';

import React, { useState } from 'react';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

interface Evaluation {
  score: number;
  criteria: {
    completeness: boolean;
    hasPricing: boolean;
    hasOpex: boolean;
    hasModules: boolean;
    hasCompetitors: boolean;
  };
  feedback: string[];
}

interface RunResponse {
  success: boolean;
  runId: string;
  blueprint?: string;
  evaluation?: Evaluation;
  logs: LogEntry[];
  error?: string;
}

export default function Home() {
  const [concept, setConcept] = useState('AI-driven code security scanner and automated vulnerability resolver');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = [
    'AI-driven code security scanner and automated vulnerability resolver',
    'AI Marketing automation platform for local brick-and-mortar stores',
    'B2B SaaS subscription simulator and cash flow forecasting toolkit'
  ];

  const handleRun = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!concept.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3002/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RunResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to execute agent loop.');
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Gradients */}
      <div style={styles.glowingBlob1}></div>
      <div style={styles.glowingBlob2}></div>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoBadge}>Foundry AI</div>
        <h1 style={styles.title}>Venture Studio Dashboard</h1>
        <p style={styles.subtitle}>
          Orchestrate multi-agent autonomous runs, analyze system telemetry, and grade blueprints in real-time.
        </p>
      </header>

      {/* Main Panel */}
      <main style={styles.main}>
        {/* Concept Input Section */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Venture Concept Blueprinting</h2>
          <p style={styles.cardText}>Describe your SaaS or software business concept. The agent will run system research, design product specs, architect modules, and build financial models.</p>
          
          <form onSubmit={handleRun} style={styles.form}>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. AI-driven billing engine..."
              style={styles.input}
              disabled={loading}
            />
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Executing Agent Loop...' : 'Generate Venture Blueprint'}
            </button>
          </form>

          {/* Presets */}
          <div style={styles.presetsContainer}>
            <span style={styles.presetsLabel}>Suggestions:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => setConcept(p)}
                style={concept === p ? styles.activePreset : styles.preset}
                disabled={loading}
              >
                {p.length > 35 ? p.substring(0, 35) + '...' : p}
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <div style={styles.loaderContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loaderText}>CEO Agent coordinating 5 subagent packages... Processing 20+ tool cycles...</p>
          </div>
        )}

        {error && (
          <div style={styles.errorCard}>
            <h3 style={styles.errorTitle}>Agent Execution Error</h3>
            <p>{error}</p>
            <p style={styles.errorSub}>Make sure your backend NestJS service is running (`npm run start:dev --workspace=agent-api`) and your `.env` contains your Gemini API Key.</p>
          </div>
        )}

        {/* Output Columns */}
        {result && (
          <div style={styles.resultsGrid}>
            
            {/* Left Column: Telemetry Log Console */}
            <div style={styles.consoleCard}>
              <div style={styles.consoleHeader}>
                <div style={styles.consoleHeaderDotRed}></div>
                <div style={styles.consoleHeaderDotYellow}></div>
                <div style={styles.consoleHeaderDotGreen}></div>
                <span style={styles.consoleTitle}>System telemetry log / Run: {result.runId.substring(0, 8)}</span>
              </div>
              <div style={styles.consoleBody}>
                {result.logs.map((log, index) => (
                  <div key={index} style={styles.logLine}>
                    <span style={styles.logTime}>[{log.timestamp.split('T')[1].substring(0, 8)}]</span>{' '}
                    <span style={log.level === 'error' ? styles.logLevelError : styles.logLevelInfo}>
                      [{log.level.toUpperCase()}]
                    </span>{' '}
                    <span style={styles.logMessage}>{log.message}</span>
                    {log.meta && (
                      <pre style={styles.logMeta}>{JSON.stringify(log.meta, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Blueprint and Evaluation */}
            <div style={styles.blueprintContainer}>
              {/* Evaluation Panel */}
              {result.evaluation && (
                <div style={styles.evalCard}>
                  <div style={styles.evalHeader}>
                    <h3 style={styles.evalTitle}>Evaluation Harness Score</h3>
                    <div style={styles.scoreBadge}>{result.evaluation.score}/100</div>
                  </div>
                  
                  {/* Criteria Checklist */}
                  <div style={styles.checklist}>
                    <div style={styles.checkItem}>
                      <span style={result.evaluation.criteria.completeness ? styles.checkIconGreen : styles.checkIconRed}>
                        {result.evaluation.criteria.completeness ? '✓' : '✗'}
                      </span>
                      <span>5 Namespaces Covered (System, Research, Product, Engineering, Finance)</span>
                    </div>
                    <div style={styles.checkItem}>
                      <span style={result.evaluation.criteria.hasPricing ? styles.checkIconGreen : styles.checkIconRed}>
                        {result.evaluation.criteria.hasPricing ? '✓' : '✗'}
                      </span>
                      <span>Tiered Pricing Structure</span>
                    </div>
                    <div style={styles.checkItem}>
                      <span style={result.evaluation.criteria.hasOpex ? styles.checkIconGreen : styles.checkIconRed}>
                        {result.evaluation.criteria.hasOpex ? '✓' : '✗'}
                      </span>
                      <span>Monthly OPEX Cost Estimation</span>
                    </div>
                    <div style={styles.checkItem}>
                      <span style={result.evaluation.criteria.hasModules ? styles.checkIconGreen : styles.checkIconRed}>
                        {result.evaluation.criteria.hasModules ? '✓' : '✗'}
                      </span>
                      <span>Technical Modules Definition</span>
                    </div>
                    <div style={styles.checkItem}>
                      <span style={result.evaluation.criteria.hasCompetitors ? styles.checkIconGreen : styles.checkIconRed}>
                        {result.evaluation.criteria.hasCompetitors ? '✓' : '✗'}
                      </span>
                      <span>Competitors Research Gaps</span>
                    </div>
                  </div>

                  {/* Feedback / Recommendations */}
                  {result.evaluation.feedback.length > 0 && (
                    <div style={styles.feedbackBox}>
                      <h4 style={styles.feedbackTitle}>Suggestions & Feedback:</h4>
                      <ul style={styles.feedbackList}>
                        {result.evaluation.feedback.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Blueprint Card */}
              <div style={styles.blueprintCard}>
                <h3 style={styles.cardTitle}>Venture Blueprint Output</h3>
                <div style={styles.blueprintScroll}>
                  <pre style={styles.blueprintText}>{result.blueprint}</pre>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Foundry AI Framework • Production-Ready Agent Architecture Selection Deliverable
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#07080d',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: '2rem 1.5rem',
    position: 'relative',
    overflow: 'hidden'
  },
  glowingBlob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  glowingBlob2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(168, 85, 247, 0) 70%)',
    bottom: '-10%',
    right: '-10%',
    zIndex: 1,
    pointerEvents: 'none'
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto 2.5rem auto',
    textAlign: 'center',
    position: 'relative',
    zIndex: 10
  },
  logoBadge: {
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    padding: '0.3rem 0.8rem',
    borderRadius: '100px',
    display: 'inline-block',
    marginBottom: '1rem',
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    marginBottom: '0.75rem',
    background: 'linear-gradient(to right, #f8fafc, #cbd5e1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '1.05rem',
    maxWidth: '650px',
    margin: '0 auto',
    lineHeight: '1.5'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 10
  },
  card: {
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    marginBottom: '2rem'
  },
  cardTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
    color: '#f8fafc'
  },
  cardText: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  form: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: '280px',
    background: 'rgba(10, 15, 30, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#f8fafc',
    padding: '0.85rem 1rem',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem 1.75rem',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
    transition: 'transform 0.1s, opacity 0.2s',
  },
  presetsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '1.2rem',
    alignItems: 'center'
  },
  presetsLabel: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginRight: '0.5rem',
    fontWeight: '500'
  },
  preset: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s'
  },
  activePreset: {
    background: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    color: '#a5b4fc',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    background: 'rgba(15, 23, 42, 0.3)',
    borderRadius: '16px',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    marginBottom: '2rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(99, 102, 241, 0.2)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.2rem'
  },
  loaderText: {
    color: '#a5b4fc',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  errorCard: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '1.5rem',
    color: '#fca5a5',
    marginBottom: '2rem',
    fontSize: '0.95rem',
    lineHeight: '1.6'
  },
  errorTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#f87171',
    marginBottom: '0.5rem'
  },
  errorSub: {
    color: '#cbd5e1',
    fontSize: '0.85rem',
    marginTop: '0.5rem'
  },
  resultsGrid: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'start',
    flexWrap: 'wrap'
  },
  consoleCard: {
    background: '#090d16',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '700px',
    flex: '1 1 500px'
  },
  consoleHeader: {
    background: '#0d1321',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  consoleHeaderDotRed: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#ef4444'
  },
  consoleHeaderDotYellow: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#eab308'
  },
  consoleHeaderDotGreen: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#22c55e'
  },
  consoleTitle: {
    color: '#64748b',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    marginLeft: '0.5rem'
  },
  consoleBody: {
    padding: '1rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    color: '#cbd5e1',
    overflowY: 'auto',
    flex: 1
  },
  logLine: {
    marginBottom: '0.75rem',
    wordBreak: 'break-all'
  },
  logTime: {
    color: '#475569'
  },
  logLevelInfo: {
    color: '#38bdf8',
    fontWeight: 'bold'
  },
  logLevelError: {
    color: '#f87171',
    fontWeight: 'bold'
  },
  logMessage: {
    color: '#f1f5f9'
  },
  logMeta: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '0.5rem',
    borderRadius: '4px',
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.02)'
  },
  blueprintContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    flex: '1 1 500px'
  },
  evalCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem'
  },
  evalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem'
  },
  evalTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#f8fafc'
  },
  scoreBadge: {
    background: 'rgba(34, 197, 94, 0.1)',
    color: '#4ade80',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    fontWeight: '800',
    fontSize: '1.2rem',
    padding: '0.4rem 1rem',
    borderRadius: '8px',
    boxShadow: '0 0 15px rgba(34, 197, 94, 0.1)'
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    marginBottom: '1.25rem'
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.9rem',
    color: '#cbd5e1'
  },
  checkIconGreen: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  checkIconRed: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  feedbackBox: {
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '1rem',
    borderRadius: '8px',
    borderLeft: '4px solid #6366f1'
  },
  feedbackTitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#a5b4fc',
    marginBottom: '0.4rem'
  },
  feedbackList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#cbd5e1',
    fontSize: '0.85rem',
    lineHeight: '1.5'
  },
  blueprintCard: {
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column'
  },
  blueprintScroll: {
    maxHeight: '400px',
    overflowY: 'auto',
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: '8px',
    padding: '1rem',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    marginTop: '1rem'
  },
  blueprintText: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap',
    margin: 0
  },
  footer: {
    textAlign: 'center',
    color: '#475569',
    fontSize: '0.8rem',
    marginTop: '4rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.02)'
  }
};
