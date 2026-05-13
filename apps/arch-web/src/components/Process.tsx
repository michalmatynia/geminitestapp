export default function Process() {
  return (
    <section className="process" id="process">
      <div className="wrap">
        <div className="sec-head">
          <div className="sec-head-meta">
            <span className="num rev">— 05 / process</span>
            <span className="label rev" data-delay="1" style={{ color: 'var(--ink-3)' }}>four movements</span>
          </div>
          <h2 className="rev" data-delay="1">How an engagement <em>unfolds.</em></h2>
        </div>

        <div className="proc-grid">
          <div className="proc-cell rev">
            <div className="proc-glyph">
              <svg viewBox="0 0 36 36">
                <rect className="g" x="6" y="6" width="24" height="24" />
                <line className="g" x1="6" y1="14" x2="30" y2="14" />
              </svg>
            </div>
            <span className="num">i.</span>
            <h3>Audit</h3>
            <p>We map your existing workflow — every touchpoint, every tool, every wasted hour. The picture is usually clarifying.</p>
          </div>
          <div className="proc-cell rev" data-delay="1">
            <div className="proc-glyph">
              <svg viewBox="0 0 36 36">
                <circle className="g" cx="18" cy="18" r="11" />
                <circle className="gf" cx="18" cy="18" r="2.4" />
              </svg>
            </div>
            <span className="num">ii.</span>
            <h3>Configure</h3>
            <p>Models are trained on your project typology, drawing conventions, and the jurisdictions in which you build.</p>
          </div>
          <div className="proc-cell rev" data-delay="2">
            <div className="proc-glyph">
              <svg viewBox="0 0 36 36">
                <line className="g" x1="6" y1="18" x2="30" y2="18" />
                <line className="g" x1="18" y1="6" x2="18" y2="30" />
                <circle className="gf" cx="18" cy="18" r="1.6" />
              </svg>
            </div>
            <span className="num">iii.</span>
            <h3>Integrate</h3>
            <p>The systems plug into Revit, AutoCAD, ArchiCAD, Rhino — no workflow disruption; new capability appears in place.</p>
          </div>
          <div className="proc-cell rev" data-delay="3">
            <div className="proc-glyph">
              <svg viewBox="0 0 36 36">
                <polyline className="g" points="6,24 14,16 22,20 30,8" />
                <circle className="gf" cx="30" cy="8" r="1.6" />
              </svg>
            </div>
            <span className="num">iv.</span>
            <h3>Refine</h3>
            <p>With each project cycle the system learns your standards. Output improves quietly, continuously, and without ceremony.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
