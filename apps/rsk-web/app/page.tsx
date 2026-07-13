function ProductMark() {
  return (
    <span className="product-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" focusable="false">
        <path d="M6 25c8-7 20-7 28 0M8 31c7-5 17-5 24 0M20 8v21" />
        <path d="M20 13c4-5 9-5 13-4-2 5-7 8-13 8M20 18c-4-4-8-5-12-3 2 4 6 6 12 7" />
      </svg>
    </span>
  );
}

const verifiedFoundation = [
  [
    'Independent application',
    'This RSK build has its own runtime, package and deployment boundary.',
  ],
  [
    'Purpose-bound by design',
    'No unrestricted farmer directory or private farmer record is connected.',
  ],
  ['Operational checks', 'Liveness and readiness are exposed as real server endpoints.'],
] as const;

export default function RskFoundationPage() {
  return (
    <div className="office-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="side-rail" aria-label="RSK foundation">
        <div className="brand-lockup">
          <ProductMark />
          <div>
            <p className="brand-name">Smart Fasal</p>
            <p className="brand-detail">RSK Operations</p>
          </div>
        </div>

        <div className="rail-section">
          <p className="rail-label">Workspace</p>
          <div className="current-location" aria-current="page">
            <span aria-hidden="true">01</span>
            <span>Foundation</span>
          </div>
        </div>

        <div className="rail-boundary">
          <span className="shield" aria-hidden="true">
            ◆
          </span>
          <div>
            <strong>Protected workspace</strong>
            <span>
              Farmer data stays absent until identity, purpose and consent controls are active.
            </span>
          </div>
        </div>
      </aside>

      <div className="office-canvas">
        <header className="global-header">
          <div>
            <p className="context-label">Office context</p>
            <p className="context-value">Raigad pilot · Rythu Seva Kendram</p>
          </div>
          <output className="header-state">
            <span className="status-dot" aria-hidden="true" />
            <span>Foundation runtime available</span>
          </output>
        </header>

        <main id="main-content" className="workspace" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">Milestone 0 · Repository runway</p>
              <h1>RSK operations foundation</h1>
              <p>
                A desktop-first base for accountable expert service. Operational queues, cases and
                farmer evidence will appear only with their owning security and data contracts.
              </p>
            </div>
            <span className="scope-chip">No farmer records loaded</span>
          </div>

          <section className="foundation-grid" aria-labelledby="foundation-checks-title">
            <div className="section-heading">
              <p className="section-index">01</p>
              <div>
                <h2 id="foundation-checks-title">Verified foundation</h2>
                <p>What this build truthfully provides now.</p>
              </div>
            </div>

            <div className="check-cards">
              {verifiedFoundation.map(([title, description]) => (
                <article className="check-card" key={title}>
                  <span className="check-symbol" aria-hidden="true">
                    ✓
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="truth-panel" aria-labelledby="truthful-state-title">
            <div>
              <p className="section-index">02</p>
              <h2 id="truthful-state-title">Truthful empty state</h2>
            </div>
            <p>
              This shell contains no invented work items, case counts, provider health or expert
              decisions. Those surfaces arrive only after the matching authorization and domain
              milestones pass.
            </p>
            <a href="/api/health/ready">Open readiness response</a>
          </section>
        </main>

        <footer className="office-footer">
          <span>Smart Fasal RSK · independent build</span>
          <span>Port 3001</span>
        </footer>
      </div>
    </div>
  );
}
