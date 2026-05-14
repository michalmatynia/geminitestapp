import type { ArchPageContent } from '@/lib/types';

export default function Metrics({ metrics }: { metrics: ArchPageContent['metrics'] }) {
  return (
    <div className="metrics">
      <div className="wrap">
        <div className="metric-grid">
          {metrics.map((metric, index) => (
          <div className="metric-cell rev" data-delay={index > 0 ? String(index) : undefined} key={`${metric.value}-${metric.label}`}>
            <span className="metric-n">
              <span className="counter" data-target={metric.value}>{metric.value}</span>
              {metric.suffix ? <span className="sx">{metric.suffix}</span> : null}
            </span>
            <span className="metric-lbl">{metric.label}</span>
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}
