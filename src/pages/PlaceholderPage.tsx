export function PlaceholderPage({ title, onOpenBanking }: { title: string; onOpenBanking: () => void }) {
  return (
    <section className="page active">
      <div className="placeholder-wrap">
        <div className="ph-icon">🧭</div>
        <h2>{title}</h2>
        <p>This part of FansMetric is unchanged in this concept — the prototype focuses on the new Banking tab, powered by SUBBAL.</p>
        <button className="table-btn primary" style={{ marginTop: 6 }} onClick={onOpenBanking}>
          Go to Banking →
        </button>
      </div>
    </section>
  );
}
