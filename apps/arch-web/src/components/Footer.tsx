export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <div className="brand" style={{ marginBottom: '4px' }}>
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">Milk Bar Designers</span>
            </div>
            <p className="addr">Herengracht 44<br />1017 BS · Amsterdam<br />The Netherlands</p>
            <p>A small studio designing software for architecture, and architecture with the help of software.</p>
          </div>

          <div className="foot-col">
            <h4>Practice</h4>
            <ul>
              <li><a href="#">Compliance</a></li>
              <li><a href="#">Massing</a></li>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Intelligence</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Studio</h4>
            <ul>
              <li><a href="#">Philosophy</a></li>
              <li><a href="#">Projects</a></li>
              <li><a href="#">Research</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>
          <div className="foot-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#">hello@milkbar.studio</a></li>
              <li><a href="#">Amsterdam</a></li>
              <li><a href="#">London</a></li>
              <li><a href="#">Zurich</a></li>
            </ul>
          </div>
        </div>

        <div className="foot-bot">
          <span>© MMXXV · Milk Bar Designers B.V.</span>
          <div className="foot-bot-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Index</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
