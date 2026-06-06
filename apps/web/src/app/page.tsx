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

interface BlueprintData {
  concept: string;
  namespacesCovered: string[];
  productRequirements: string[];
  architectureModules: string[];
  financialModel?: {
    monthlyOpexEstimate: number;
    pricingStrategy: Array<{ planName: string; price: number }>;
  };
  competitors: string[];
}

export default function Home() {
  const [concept, setConcept] = useState('B2B SaaS subscription simulator and cash flow forecasting toolkit');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw'>('parsed');

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
      setActiveTab('parsed');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during execution.');
    } finally {
      setLoading(false);
    }
  };

  const parseBlueprint = (text?: string): BlueprintData | null => {
    if (!text) return null;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
      if (!jsonMatch) return null;
      const rawJson = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(rawJson.trim());
    } catch (e) {
      console.error('Failed to parse blueprint JSON:', e);
      return null;
    }
  };

  const downloadPdf = () => {
    if (!result) return;
    const bp = parseBlueprint(result.blueprint);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (bp) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Venture Blueprint: ${bp.concept}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap');
              body {
                font-family: 'Space Grotesk', 'Inter', sans-serif;
                padding: 40px;
                color: #000000;
                background: #ffffff;
                line-height: 1.5;
              }
              .header {
                border-bottom: 5px solid #000000;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .logo {
                font-weight: 800;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 2px;
                background: #facc15;
                display: inline-block;
                padding: 6px 14px;
                border: 3px solid #000000;
                margin-bottom: 15px;
              }
              h1 {
                font-size: 28px;
                font-weight: 800;
                margin: 0 0 10px 0;
              }
              .concept {
                font-size: 16px;
                color: #4b5563;
              }
              .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
              }
              .section {
                border: 3px solid #000000;
                padding: 20px;
                margin-bottom: 25px;
                background: #ffffff;
                box-shadow: 5px 5px 0px #000000;
                break-inside: avoid;
              }
              .section-title {
                font-size: 16px;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 3px solid #000000;
                padding-bottom: 8px;
                margin-top: 0;
                margin-bottom: 15px;
                display: inline-block;
              }
              ul {
                padding-left: 20px;
                margin: 0;
              }
              li {
                margin-bottom: 8px;
              }
              .pricing-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              .pricing-table th, .pricing-table td {
                border: 2px solid #000000;
                padding: 10px;
                text-align: left;
              }
              .pricing-table th {
                background: #a3e635;
                font-weight: 700;
              }
              .footer {
                margin-top: 50px;
                border-top: 3px solid #000000;
                padding-top: 15px;
                font-size: 12px;
                text-align: center;
                font-weight: 700;
                text-transform: uppercase;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">Foundry AI Venture Blueprint</div>
              <h1>${bp.concept}</h1>
              <div class="concept">Generated autonomously by Foundry AI Multi-Agent Orchestrator</div>
            </div>
            
            <div class="grid">
              <div class="section">
                <h2 class="section-title">Market Competitors</h2>
                <ul>
                  ${bp.competitors.map(c => `<li><strong>${c}</strong></li>`).join('')}
                </ul>
              </div>
              
              <div class="section">
                <h2 class="section-title">Product Requirements</h2>
                <ul>
                  ${bp.productRequirements.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>

              <div class="section">
                <h2 class="section-title">System Architecture Modules</h2>
                <ul>
                  ${bp.architectureModules.map(m => `<li>${m}</li>`).join('')}
                </ul>
              </div>

              <div class="section">
                <h2 class="section-title">Financial Model</h2>
                <p style="margin-bottom: 15px;"><strong>Estimated Monthly OPEX:</strong> $${bp.financialModel?.monthlyOpexEstimate?.toLocaleString() || 'N/A'}</p>
                <table class="pricing-table">
                  <thead>
                    <tr>
                      <th>Plan Tier</th>
                      <th>Monthly Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${bp.financialModel?.pricingStrategy?.map(p => `
                      <tr>
                        <td><strong>${p.planName}</strong></td>
                        <td>$${p.price}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="2">No pricing available</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="footer">
              Foundry AI Framework • Production-Ready Agent Architecture Selection Deliverable
            </div>

            <script>
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 250);
            </script>
          </body>
        </html>
      `);
    } else {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Venture Blueprint</title>
            <style>
              body {
                font-family: monospace;
                padding: 40px;
                color: #000000;
                line-height: 1.5;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            ${result.blueprint}
            <script>
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 250);
            </script>
          </body>
        </html>
      `);
    }
    printWindow.document.close();
  };

  const parsedData = result ? parseBlueprint(result.blueprint) : null;

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        
        body {
          background-color: #f7f6f0;
          color: #000000;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .neo-card {
          border: 4px solid #000000;
          box-shadow: 8px 8px 0px #000000;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .neo-card:hover {
          transform: translate(-4px, -4px);
          box-shadow: 12px 12px 0px #000000;
        }

        .neo-btn {
          border: 3px solid #000000;
          box-shadow: 4px 4px 0px #000000;
          transition: transform 0.1s, box-shadow 0.1s;
        }

        .neo-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0px #000000;
        }

        .neo-btn:active:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px #000000;
        }

        .neo-input {
          border: 3px solid #000000;
          box-shadow: 4px 4px 0px #000000;
        }

        .neo-input:focus {
          outline: none;
          box-shadow: 6px 6px 0px #000000;
        }
      `}} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoBadge}>Foundry AI</div>
        <h1 style={styles.title}>Venture Blueprinting Dashboard</h1>
        <p style={styles.subtitle}>
          Generate enterprise-grade SaaS business specs, product requirements, database module architecture, and financial models.
        </p>
      </header>

      {/* Main Panel */}
      <main style={styles.main}>
        {/* Input Card */}
        <section className="neo-card" style={styles.inputCard}>
          <h2 style={styles.cardHeading}>Describe Venture Concept</h2>
          <p style={styles.cardSubText}>Enter your startup or SaaS software concept. Our orchestrator will run autonomous research, specify requirements, design modules, and model economics.</p>
          
          <form onSubmit={handleRun} style={styles.form}>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. AI-driven billing engine..."
              className="neo-input"
              style={styles.input}
              disabled={loading}
            />
            <button type="submit" className="neo-btn" style={styles.submitBtn} disabled={loading}>
              {loading ? (
                <div style={styles.btnLoading}>
                  <div style={styles.smallSpinner}></div>
                  <span>Orchestrating...</span>
                </div>
              ) : (
                'Generate Venture Blueprint'
              )}
            </button>
          </form>

          {/* Suggestions */}
          <div style={styles.presetsContainer}>
            <span style={styles.presetsLabel}>Presets:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => setConcept(p)}
                className="neo-btn"
                style={concept === p ? styles.activePreset : styles.preset}
                disabled={loading}
              >
                {p.length > 40 ? p.substring(0, 40) + '...' : p}
              </button>
            ))}
          </div>
        </section>

        {loading && (
          <div className="neo-card" style={styles.loaderContainer}>
            <div style={styles.spinner}></div>
            <h3 style={styles.loaderHeading}>Orchestrator Executing Agent Loop</h3>
            <p style={styles.loaderText}>Spawning specialized agents (Research, Product, Engineering, Finance)... This will take 30-40 seconds.</p>
          </div>
        )}

        {error && (
          <div className="neo-card" style={styles.errorCard}>
            <h3 style={styles.errorHeading}>Agent Execution Error</h3>
            <p style={{ margin: '0 0 10px 0' }}>{error}</p>
            <p style={styles.errorSub}>Make sure your backend NestJS service is running (`npm run start:dev --workspace=agent-api`) and your `.env` contains your Gemini API Key.</p>
          </div>
        )}

        {/* Output Area */}
        {result && (
          <div style={styles.outputArea}>
            {/* Header / Actions */}
            <div style={styles.outputHeader}>
              <div style={styles.tabButtons}>
                <button
                  className="neo-btn"
                  onClick={() => setActiveTab('parsed')}
                  style={{
                    ...styles.tabBtn,
                    background: activeTab === 'parsed' ? '#facc15' : '#ffffff',
                    fontWeight: '700'
                  }}
                >
                  Enterprise Dashboard
                </button>
                <button
                  className="neo-btn"
                  onClick={() => setActiveTab('raw')}
                  style={{
                    ...styles.tabBtn,
                    background: activeTab === 'raw' ? '#facc15' : '#ffffff',
                    fontWeight: '700'
                  }}
                >
                  Raw Blueprint Output
                </button>
              </div>

              <button className="neo-btn" onClick={downloadPdf} style={styles.pdfBtn}>
                📥 Download PDF Blueprint
              </button>
            </div>

            {activeTab === 'raw' ? (
              <div className="neo-card" style={styles.rawCard}>
                <h3 style={styles.sectionHeading}>Raw Agent Blueprint</h3>
                <pre style={styles.rawText}>{result.blueprint}</pre>
              </div>
            ) : (
              <div style={styles.dashboardGrid}>
                {/* Left Side: Score & Checklist */}
                {result.evaluation && (
                  <div className="neo-card" style={{ ...styles.gridCard, background: '#ffffff' }}>
                    <div style={styles.evalHeader}>
                      <h3 style={styles.sectionHeading}>Evaluation Grade</h3>
                      <div style={styles.scoreBadge}>{result.evaluation.score}/100</div>
                    </div>
                    
                    <div style={styles.checklist}>
                      <div style={styles.checkItem}>
                        <div style={{
                          ...styles.checkIcon,
                          background: result.evaluation.criteria.completeness ? '#a3e635' : '#ef4444'
                        }}>
                          {result.evaluation.criteria.completeness ? '✓' : '✗'}
                        </div>
                        <span>All 5 Domain Namespaces Covered</span>
                      </div>
                      <div style={styles.checkItem}>
                        <div style={{
                          ...styles.checkIcon,
                          background: result.evaluation.criteria.hasPricing ? '#a3e635' : '#ef4444'
                        }}>
                          {result.evaluation.criteria.hasPricing ? '✓' : '✗'}
                        </div>
                        <span>Tiered Pricing Strategy</span>
                      </div>
                      <div style={styles.checkItem}>
                        <div style={{
                          ...styles.checkIcon,
                          background: result.evaluation.criteria.hasOpex ? '#a3e635' : '#ef4444'
                        }}>
                          {result.evaluation.criteria.hasOpex ? '✓' : '✗'}
                        </div>
                        <span>Monthly OPEX Estimation</span>
                      </div>
                      <div style={styles.checkItem}>
                        <div style={{
                          ...styles.checkIcon,
                          background: result.evaluation.criteria.hasModules ? '#a3e635' : '#ef4444'
                        }}>
                          {result.evaluation.criteria.hasModules ? '✓' : '✗'}
                        </div>
                        <span>Technical Modules Architecture</span>
                      </div>
                      <div style={styles.checkItem}>
                        <div style={{
                          ...styles.checkIcon,
                          background: result.evaluation.criteria.hasCompetitors ? '#a3e635' : '#ef4444'
                        }}>
                          {result.evaluation.criteria.hasCompetitors ? '✓' : '✗'}
                        </div>
                        <span>Market Competitors Defined</span>
                      </div>
                    </div>

                    {result.evaluation.feedback.length > 0 && (
                      <div style={styles.feedbackBox}>
                        <h4 style={styles.feedbackHeading}>Analysis Feedback:</h4>
                        <ul style={styles.feedbackList}>
                          {result.evaluation.feedback.map((f, i) => (
                            <li key={i} style={{ marginBottom: '6px' }}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Right Side: Competitors & Financials */}
                {parsedData && (
                  <>
                    <div className="neo-card" style={{ ...styles.gridCard, background: '#e0f2fe' }}>
                      <h3 style={styles.sectionHeading}>Market Competitors</h3>
                      <div style={styles.competitorsList}>
                        {parsedData.competitors.map((c, i) => (
                          <div key={i} className="neo-card" style={styles.competitorCard}>
                            <strong>{c}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="neo-card" style={{ ...styles.gridCard, background: '#fef08a' }}>
                      <h3 style={styles.sectionHeading}>Financial Modeling</h3>
                      <div style={styles.financialStats}>
                        <div style={styles.statBox}>
                          <span style={styles.statLabel}>Estimated Monthly OPEX</span>
                          <span style={styles.statValue}>
                            ${parsedData.financialModel?.monthlyOpexEstimate?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <h4 style={{ ...styles.sectionHeading, fontSize: '1.1rem', marginTop: '1.5rem' }}>Tiered Pricing Strategy</h4>
                      <div style={styles.pricingGrid}>
                        {parsedData.financialModel?.pricingStrategy?.map((p, i) => (
                          <div key={i} className="neo-card" style={styles.pricingCard}>
                            <span style={styles.pricingTier}>{p.planName}</span>
                            <span style={styles.pricingVal}>${p.price}<small>/mo</small></span>
                          </div>
                        )) || <p>No pricing tiers generated.</p>}
                      </div>
                    </div>

                    <div className="neo-card" style={{ ...styles.gridCard, background: '#fbcfe8' }}>
                      <h3 style={styles.sectionHeading}>Product Requirements</h3>
                      <ul style={styles.bulletList}>
                        {parsedData.productRequirements.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="neo-card" style={{ ...styles.gridCard, background: '#ccfbf1' }}>
                      <h3 style={styles.sectionHeading}>System Architecture</h3>
                      <div style={styles.modulesGrid}>
                        {parsedData.architectureModules.map((m, i) => (
                          <div key={i} className="neo-card" style={styles.moduleCard}>
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Foundry AI Framework • Enterprise Venture Orchestration System
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    padding: '2.5rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  header: {
    maxWidth: '1000px',
    width: '100%',
    textAlign: 'center',
    marginBottom: '2.5rem'
  },
  logoBadge: {
    display: 'inline-block',
    background: '#000000',
    color: '#a3e635',
    border: '3px solid #000000',
    boxShadow: '3px 3px 0px #000000',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    padding: '0.4rem 1.2rem',
    fontSize: '0.9rem',
    fontFamily: "'Space Grotesk', sans-serif",
    marginBottom: '1.2rem'
  },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '3rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    color: '#000000',
    marginBottom: '0.8rem',
    lineHeight: '1.1'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#4b5563',
    maxWidth: '700px',
    margin: '0 auto',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  main: {
    maxWidth: '1000px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  inputCard: {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: '0px'
  },
  cardHeading: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.6rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  cardSubText: {
    color: '#4b5563',
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
    background: '#ffffff',
    color: '#000000',
    padding: '0.9rem 1.2rem',
    fontSize: '1rem',
    fontWeight: '500',
    borderRadius: '0px'
  },
  submitBtn: {
    background: '#a3e635',
    color: '#000000',
    borderRadius: '0px',
    padding: '0.9rem 1.8rem',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  btnLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem'
  },
  smallSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(0, 0, 0, 0.2)',
    borderTop: '2px solid #000000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  presetsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    marginTop: '1.5rem',
    alignItems: 'center'
  },
  presetsLabel: {
    fontWeight: '700',
    fontSize: '0.9rem',
    marginRight: '0.5rem'
  },
  preset: {
    background: '#ffffff',
    color: '#000000',
    borderRadius: '0px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  activePreset: {
    background: '#facc15',
    color: '#000000',
    borderRadius: '0px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  loaderContainer: {
    background: '#ffffff',
    padding: '3rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0px',
    textAlign: 'center'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderTop: '4px solid #000000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.5rem'
  },
  loaderHeading: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.4rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  loaderText: {
    color: '#4b5563',
    fontSize: '0.95rem'
  },
  errorCard: {
    background: '#fca5a5',
    border: '4px solid #ef4444',
    padding: '1.5rem',
    borderRadius: '0px',
    color: '#000000'
  },
  errorHeading: {
    fontSize: '1.2rem',
    fontWeight: '800',
    marginBottom: '0.5rem'
  },
  errorSub: {
    fontSize: '0.85rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    color: '#374151'
  },
  outputArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  tabButtons: {
    display: 'flex',
    gap: '0.8rem'
  },
  tabBtn: {
    borderRadius: '0px',
    padding: '0.6rem 1.2rem',
    cursor: 'pointer',
    color: '#000000'
  },
  pdfBtn: {
    background: '#ff7a00',
    color: '#ffffff',
    fontWeight: '700',
    borderRadius: '0px',
    padding: '0.6rem 1.2rem',
    cursor: 'pointer'
  },
  rawCard: {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: '0px'
  },
  rawText: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    background: '#f3f4f6',
    padding: '1.5rem',
    border: '3px solid #000000',
    margin: 0
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
    gap: '1.8rem'
  },
  gridCard: {
    background: '#ffffff',
    padding: '2rem',
    borderRadius: '0px',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionHeading: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '1.3rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '1.2rem',
    borderBottom: '3px solid #000000',
    paddingBottom: '0.5rem',
    display: 'inline-block'
  },
  evalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  scoreBadge: {
    background: '#a3e635',
    color: '#000000',
    border: '3px solid #000000',
    boxShadow: '3px 3px 0px #000000',
    fontWeight: '900',
    fontSize: '1.4rem',
    padding: '0.4rem 1.2rem'
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    marginBottom: '1.5rem'
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  checkIcon: {
    width: '24px',
    height: '24px',
    border: '2px solid #000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    color: '#000000',
    fontSize: '0.9rem'
  },
  feedbackBox: {
    background: '#f3f4f6',
    border: '3px solid #000000',
    padding: '1.2rem',
    marginTop: 'auto'
  },
  feedbackHeading: {
    fontWeight: '700',
    fontSize: '0.9rem',
    color: '#000000',
    marginBottom: '0.5rem',
    textTransform: 'uppercase'
  },
  feedbackList: {
    paddingLeft: '1.2rem',
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: '500',
    lineHeight: '1.4'
  },
  competitorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem'
  },
  competitorCard: {
    background: '#ffffff',
    padding: '0.85rem 1.2rem',
    borderRadius: '0px'
  },
  financialStats: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem'
  },
  statBox: {
    flex: 1,
    background: '#ffffff',
    border: '3px solid #000000',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem'
  },
  statLabel: {
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#4b5563'
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: '900',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.8rem'
  },
  pricingCard: {
    background: '#ffffff',
    padding: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: '0px',
    textAlign: 'center'
  },
  pricingTier: {
    fontSize: '0.85rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: '0.4rem'
  },
  pricingVal: {
    fontSize: '1.2rem',
    fontWeight: '900',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  bulletList: {
    paddingLeft: '1.5rem',
    margin: 0,
    lineHeight: '1.6',
    fontWeight: '600',
    fontSize: '0.95rem'
  },
  modulesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.8rem'
  },
  moduleCard: {
    background: '#ffffff',
    padding: '1rem',
    borderRadius: '0px',
    fontWeight: '700',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    color: '#000000',
    letterSpacing: '1px',
    marginTop: '4rem',
    borderTop: '4px solid #000000',
    paddingTop: '1.5rem',
    textAlign: 'center',
    width: '100%',
    maxWidth: '1000px'
  }
};
