import { useState, type CSSProperties } from 'react';
import { fmt } from '../lib/format';

/* Ports of the sample's hand-rolled SVG charts. */

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

export function BarChart({ categories, series, w = 600, h = 200 }: { categories: string[]; series: BarSeries[]; w?: number; h?: number }) {
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const padT = 8;
  const padB = 4;
  const plotH = h - padT - padB;
  const max = Math.max(...series.flatMap((s) => s.values), 0) * 1.12 || 1;
  const groupW = w / Math.max(categories.length, 1);
  const groupPad = groupW * 0.16;
  const usableW = groupW - groupPad * 2;
  const barGap = usableW * 0.1;
  const barW = (usableW - barGap * (series.length - 1)) / series.length;

  return (
    <>
      <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {categories.map((cat, gi) =>
          series.map((s, si) => {
            const val = s.values[gi] ?? 0;
            const barH = Math.max(1, (val / max) * plotH);
            const label = `${cat} — ${s.name}: ${fmt(val)}`;
            return (
              <rect
                key={`${gi}-${si}`}
                x={gi * groupW + groupPad + si * (barW + barGap)}
                y={padT + (plotH - barH)}
                width={barW}
                height={barH}
                rx={2.5}
                fill={s.color}
                className="chart-bar"
                aria-label={label}
                onMouseEnter={(e) => setTip({ label, x: e.clientX, y: e.clientY })}
                onMouseMove={(e) => setTip({ label, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTip(null)}
              />
            );
          }),
        )}
      </svg>
      <div className={'chart-tooltip' + (tip ? ' show' : '')} style={tip ? { left: tip.x + 14, top: tip.y + 14 } : undefined}>
        {tip?.label}
      </div>
    </>
  );
}

export function TrendChart({ values, color, uid }: { values: number[]; color: string; uid: string | number }) {
  const w = 560;
  const h = 150;
  const pad = 8;
  const max = Math.max(...values, 0) * 1.15 || 1;
  const step = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({ x: pad + i * step, y: h - pad - (v / max) * (h - 2 * pad) }));
  if (!pts.length) return null;
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} ${pts[pts.length - 1].x.toFixed(1)},${h - pad} ${pts[0].x.toFixed(1)},${h - pad}`;
  const gid = `trendFill${uid}`;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3.2" fill={color} />
      ))}
    </svg>
  );
}

export function MonthsRow({ labels }: { labels: string[] }) {
  return (
    <div className="chart-months-row">
      {labels.map((m, i) => (
        <span key={i}>{m}</span>
      ))}
    </div>
  );
}

/** CSS conic-gradient donut; `business` is the agency %. */
export function SplitDonut({ business, emphasize = false }: { business: number; emphasize?: boolean }) {
  const pct = (n: number) => (emphasize ? <strong>{n}%</strong> : `${n}%`);
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ '--business': business } as CSSProperties}>
        <span>Split</span>
      </div>
      <div className="donut-legend">
        <div>
          <span className="dot dot-blue"></span>Business {pct(business)}
        </div>
        <div>
          <span className="dot dot-teal"></span>Creator {pct(100 - business)}
        </div>
      </div>
    </div>
  );
}
