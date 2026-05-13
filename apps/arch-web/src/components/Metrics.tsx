export default function Metrics() {
  return (
    <div className="metrics">
      <div className="wrap">
        <div className="metric-grid">
          <div className="metric-cell rev">
            <span className="metric-n">
              <span className="counter" data-target="340">340</span>
              <span className="sx">+</span>
            </span>
            <span className="metric-lbl">Projects processed<br />through studio systems</span>
          </div>
          <div className="metric-cell rev" data-delay="1">
            <span className="metric-n">
              <span className="counter" data-target="72">72</span>
              <span className="sx">%</span>
            </span>
            <span className="metric-lbl">Median reduction<br />in documentation hours</span>
          </div>
          <div className="metric-cell rev" data-delay="2">
            <span className="metric-n">
              <span className="counter" data-target="98">98</span>
              <span className="sx">.4%</span>
            </span>
            <span className="metric-lbl">Compliance check<br />accuracy rate</span>
          </div>
          <div className="metric-cell rev" data-delay="3">
            <span className="metric-n">
              <span className="counter" data-target="38">38</span>
            </span>
            <span className="metric-lbl">Active jurisdictional<br />regulation models</span>
          </div>
        </div>
      </div>
    </div>
  );
}
