export default function HomePage() {
  return (
    <main className="page">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">KENYA · COMMERCE WORKSPACE</p>
        <h1 id="page-title">Your business, in one place.</h1>
        <p className="description">
          Publish products, keep stock accurate, and manage customer orders from one workspace.
        </p>
        <div className="status" role="status">
          <span className="status-dot" aria-hidden="true" />
          Foundation setup · no live payments enabled
        </div>
      </section>
      <section className="setup" aria-labelledby="setup-title">
        <h2 id="setup-title">Implementation status</h2>
        <ul>
          <li><span>01</span><div><strong>Secure tenant foundation</strong><p>Database policies and tenant membership come first.</p></div></li>
          <li><span>02</span><div><strong>Product catalogue and stock ledger</strong><p>Product changes and inventory movements must be auditable.</p></div></li>
          <li><span>03</span><div><strong>Storefront and checkout</strong><p>Prices and availability will be verified on the server.</p></div></li>
          <li><span>04</span><div><strong>Verified payment integration</strong><p>Sandbox callbacks and reconciliation must pass tests before live use.</p></div></li>
        </ul>
      </section>
    </main>
  );
}