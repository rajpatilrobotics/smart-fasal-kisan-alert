const foundationChecks = [
  'शेतकरी सेवेसाठी स्वतंत्र सुरक्षित वेब बिल्ड',
  'मोबाइल आणि कमी रुंदीच्या स्क्रीनसाठी प्रतिसादक्षम रचना',
  'आरोग्य आणि तयारी तपासणीसाठी खरे सर्व्हर मार्ग',
];

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

export default function FarmerFoundationPage() {
  return (
    <div className="farmer-shell">
      <a className="skip-link" href="#main-content">
        मुख्य मजकुराकडे जा
      </a>

      <header className="app-header">
        <div className="brand-lockup">
          <ProductMark />
          <div>
            <p className="brand-name">Smart Fasal</p>
            <p className="brand-detail">Kisan Alert · शेतकरी सेवा</p>
          </div>
        </div>
        <span className="pilot-chip">रायगड पायलट</span>
      </header>

      <output className="context-strip">
        <span className="status-dot" aria-hidden="true" />
        <span>सुरक्षित पायाभूत बिल्ड चालू आहे</span>
      </output>

      <main id="main-content" className="content" tabIndex={-1}>
        <section className="hero-card" aria-labelledby="farmer-foundation-title">
          <p className="eyebrow">Milestone 0 · पायाभूत आवृत्ती</p>
          <h1 id="farmer-foundation-title">शेतकरी अ‍ॅपची मजबूत पायाभरणी तयार आहे</h1>
          <p className="lead">
            ही स्वतंत्र, मोबाइल-फर्स्ट अ‍ॅप बिल्ड आहे. शेताचा वैयक्तिक सल्ला, सेन्सर माहिती आणि
            कामांची नोंद सुरक्षित ओळख व अधिकृत डेटा जोडल्यावरच दिसेल.
          </p>

          <div className="boundary-note">
            <strong>स्पष्ट स्थिती</strong>
            <span>या पायाभूत स्क्रीनवर शेतीचा बनावट सल्ला किंवा नमुना आकडे दाखवलेले नाहीत.</span>
          </div>

          <h2>या बिल्डमध्ये तपासलेली पायाभरणी</h2>
          <ul className="check-list">
            {foundationChecks.map((check) => (
              <li key={check}>
                <span aria-hidden="true">✓</span>
                {check}
              </li>
            ))}
          </ul>

          <a className="primary-link" href="/api/health/ready">
            अ‍ॅपची तयारी तपासा
          </a>
        </section>

        <p className="language-note">मराठी प्रथम · हिंदी आणि English पुढील उत्पादन टप्प्यात</p>
      </main>

      <footer className="foundation-footer">
        <span>Smart Fasal Farmer</span>
        <span>स्वतंत्र बिल्ड · Port 3000</span>
      </footer>
    </div>
  );
}
