import type { ArchPageContent } from '@/lib/types';

export default function Footer({ content }: { content: ArchPageContent['footer'] }) {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <div className="brand" style={{ marginBottom: '4px' }}>
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">{content.brandName}</span>
            </div>
            <p className="addr">
              {content.address.split('\n').map((line) => (
                <span key={line}>{line}<br /></span>
              ))}
            </p>
            <p>{content.tagline}</p>
          </div>

          {content.columns.map((column) => (
            <div className="foot-col" key={column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}><a href={link.href}>{link.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="foot-bot">
          <span>{content.copyright}</span>
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
