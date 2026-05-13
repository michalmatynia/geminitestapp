export default function Philosophy() {
  return (
    <section className="philosophy" id="studio">
      <div className="wrap">
        <div className="phil-grid">
          <div className="phil-text">
            <span className="label rev">— 02 / philosophy</span>
            <h2 className="rev" data-delay="1" style={{ marginTop: '18px' }}>
              The discipline<br />of <em>negative space.</em>
            </h2>
            <p className="rev" data-delay="2">
              In architecture, the most powerful element is often what is absent. The void between
              walls defines a room. The pause between columns creates rhythm. We hold our software
              to the same standard.
            </p>
            <p className="rev" data-delay="3">We do not add complexity. We subtract it.</p>
          </div>

          <div className="phil-figure rev" data-delay="2">
            <span className="phil-caption">the productive void</span>
          </div>
        </div>

        <div className="principles">
          <div className="prin-row rev">
            <span className="prin-num">i.</span>
            <div className="prin-title">
              Reduce, then refine<em>— restraint as method</em>
            </div>
            <p className="prin-desc">
              Remove every redundant process before optimising what remains.
              Complexity is never a solution; it is a symptom.
            </p>
          </div>
          <div className="prin-row rev" data-delay="1">
            <span className="prin-num">ii.</span>
            <div className="prin-title">
              Precision over speed<em>— accuracy is non-negotiable</em>
            </div>
            <p className="prin-desc">
              Our models are trained on building codes across thirty-eight jurisdictions.
              Output is verified against the canon before it leaves the studio.
            </p>
          </div>
          <div className="prin-row rev" data-delay="2">
            <span className="prin-num">iii.</span>
            <div className="prin-title">
              Augment, never replace<em>— the architect remains</em>
            </div>
            <p className="prin-desc">
              The architect&apos;s eye is irreplaceable. We automate the administrative so
              creativity operates unencumbered by the regulatory.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
