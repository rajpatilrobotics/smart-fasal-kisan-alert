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

const releasePrinciples = [
  {
    label: 'Release only',
    title: 'No operational farmer access',
    description:
      'This application is physically separate from farmer, farm, case, media and device systems.',
  },
  {
    label: 'Fail closed',
    title: 'No snapshot, no metric',
    description:
      'Incomplete, unsigned or privacy-suppressed aggregate values must remain unavailable.',
  },
  {
    label: 'Same evidence',
    title: 'Accessible by default',
    description:
      'Every future map or chart will require an equivalent released-data table or list.',
  },
] as const;

export default function MpFoundationPage() {
  return (
    <div className="intelligence-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="side-rail" aria-label="MP Office foundation">
        <div className="brand-lockup">
          <ProductMark />
          <div>
            <p className="brand-name">Smart Fasal</p>
            <p className="brand-detail">MP Office Intelligence</p>
          </div>
        </div>

        <div className="rail-rule" />
        <p className="rail-label">Decision workspace</p>
        <div className="current-location" aria-current="page">
          <span aria-hidden="true">◇</span>
          <span>Foundation</span>
        </div>

        <div className="privacy-boundary">
          <p>Privacy boundary</p>
          <strong>Released aggregates only</strong>
          <span>No identity, exact farm, case or private operational data.</span>
        </div>
      </aside>

      <div className="intelligence-canvas">
        <header className="global-header">
          <div className="context-group">
            <div>
              <span className="context-label">Pilot area</span>
              <strong>Raigad, Maharashtra</strong>
            </div>
            <span className="context-divider" aria-hidden="true" />
            <div>
              <span className="context-label">Release state</span>
              <strong>No active snapshot</strong>
            </div>
          </div>
          <span className="environment-chip">Foundation environment</span>
        </header>

        <main id="main-content" className="workspace" tabIndex={-1}>
          <div className="title-row">
            <div>
              <p className="eyebrow">Decision intelligence · Milestone 0</p>
              <h1>MP Office foundation</h1>
              <p className="lead">
                A restrained, desktop-first base for constituency decisions using signed,
                privacy-released aggregates—never individual farmer operations.
              </p>
            </div>
            <a className="readiness-link" href="/api/health/ready">
              View readiness response
            </a>
          </div>

          <section aria-labelledby="release-contract-title">
            <div className="section-heading">
              <span>01</span>
              <div>
                <h2 id="release-contract-title">Release contract</h2>
                <p>The non-negotiable boundary already visible in this independent build.</p>
              </div>
            </div>

            <div className="principle-grid">
              {releasePrinciples.map((principle) => (
                <article className="principle-card" key={principle.title}>
                  <p className="card-label">{principle.label}</p>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="empty-release" aria-labelledby="release-state-title">
            <div className="empty-graphic" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="card-label">Current state</p>
              <h2 id="release-state-title">No aggregate data has been released</h2>
              <p>
                The foundation intentionally shows no invented maps, rankings, percentages or
                constituency trends. A later milestone can activate only a complete signed release.
              </p>
            </div>
          </section>
        </main>

        <footer className="office-footer">
          <span>Smart Fasal MP Office · independent build</span>
          <span>Port 3002</span>
        </footer>
      </div>
    </div>
  );
}
