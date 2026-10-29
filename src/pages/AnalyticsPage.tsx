import { Icon } from '../components/icons';
import { useToast } from '../components/Toast';

// FansMetric's own (OnlyFans) KPI data is not part of the SUBBAL API, so this page keeps
// the sample's illustrative figures.
const AREA =
  '0,168 13,163 27,168 40,158 53,147 67,153 80,146 93,120 107,148 120,150 133,146 147,127 160,144 173,153 187,153 200,147 213,113 227,110 240,132 253,139 267,107 280,118 293,111 307,118 320,125 333,94 347,120 360,131 373,116 387,129 400,100 413,134 427,113 440,98 453,129 467,97 480,104 493,124 507,103 520,93 533,138 547,103 560,126 573,139 587,110 600,125';
const TREND = '0,161 55,154 109,154 164,154 218,158 273,164 327,173 382,168 436,167 491,162 545,156 600,149';

const METRICS = [
  { val: '$19,230,780.1', delta: '+26.6%', label: 'All Earnings', info: true },
  { val: '2,523,323', label: 'New Subscribers' },
  { val: '48,875', label: 'Monthly Active Fans' },
  { val: '$2,901,524.3', label: 'Monthly Earning Rate' },
];

const TOP_FANS = [
  ['u_29104', '1,301', '$206.63K'],
  ['u_88451', '444', '$67,663'],
  ['u_10233', '258', '$22,216'],
  ['u_57902', '199', '$18,284'],
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning!' : h < 18 ? 'Good afternoon!' : 'Good evening!';
}

export function AnalyticsPage({ onOpenBanking }: { onOpenBanking: () => void }) {
  const toast = useToast();
  return (
    <section className="page active">
      <div className="card fm-hero">
        <div>
          <h1>{greeting()}</h1>
          <p className="page-sub">Here's an overview of the selected accounts.</p>
        </div>
        <div className="fm-hero-stats">
          <div className="fm-hero-stat"><span className="val">$38.67M</span><span className="lbl">Total Earnings</span></div>
          <div className="fm-hero-stat"><span className="val">1,457,875</span><span className="lbl">Purchase Count</span></div>
          <div className="fm-hero-stat"><span className="val">$33.16</span><span className="lbl">Average Purchase</span></div>
        </div>
      </div>

      <div className="filter-row">
        <div className="filter-pill"><Icon.Globe />Africa/Abidjan <span className="chev">▾</span></div>
        <div className="filter-pill">Last 6 months <span className="chev">▾</span></div>
        <div className="filter-pill"><Icon.Calendar />Mar 1, 2026 – Aug 31, 2026</div>
        <div className="filter-pill">Net Revenue <span className="chev">▾</span></div>
      </div>

      <div className="grid-2col">
        <div className="card">
          <div className="card-head">
            <h3>Earning Metrics <span className="info-dot">?</span></h3>
            <button className="link" onClick={() => toast('Interactive charts — demo only')}>View interactive charts</button>
          </div>
          <div className="metrics-2x2">
            {METRICS.map((m) => (
              <div className="metric-cell" key={m.label}>
                <div>
                  <span className="mc-val">{m.val}</span>
                  {m.delta && <span className="mc-delta">{m.delta}</span>}
                  <div className="mc-label">
                    {m.label} {m.info && <span className="info-dot">i</span>}
                  </div>
                </div>
                <span className="mc-chevrons"><Icon.UpDown /></span>
              </div>
            ))}
          </div>
          <svg className="chart-svg" viewBox="0 0 600 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fmFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3d7fff" stopOpacity=".35" />
                <stop offset="1" stopColor="#3d7fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`${AREA} 600,200 0,200`} fill="url(#fmFill)" />
            <polyline points={TREND} fill="none" stroke="#5d6883" strokeWidth="1.6" strokeDasharray="3 4" />
            <polyline points={AREA} fill="none" stroke="#3d7fff" strokeWidth="2" />
          </svg>
        </div>
        <div className="side-col">
          <div className="card">
            <h3>Top fans</h3>
            <table className="tx-table">
              <thead><tr><th>Fan</th><th>Purch.</th><th>Spend</th></tr></thead>
              <tbody>
                {TOP_FANS.map(([fan, purch, spend]) => (
                  <tr key={fan}><td>{fan}</td><td>{purch}</td><td className="pos">{spend}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ borderStyle: 'dashed' }}>
        <div className="card-head">
          <h3>💡 New: Banking, powered by SUBBAL</h3>
          <button className="link" onClick={onOpenBanking}>Open Banking →</button>
        </div>
        <p className="muted-text" style={{ margin: 0 }}>
          Manage creator sub-balances, automated revenue splits and payouts natively inside FansMetric — no need to switch platforms.
        </p>
      </div>
    </section>
  );
}
