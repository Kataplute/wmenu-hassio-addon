import { MONTHS, produceForMonth, SEASONS } from "../data/index.js";

const monthSeason = (m) => (m >= 3 && m <= 5 ? "spring" : m >= 6 && m <= 8 ? "summer" : m >= 9 && m <= 11 ? "autumn" : "winter");

const SeasonsScreen = () => {
  const current = new Date().getMonth() + 1; // 1..12

  return (
    <div className="screen seasons">
      <header className="screen-head">
        <div>
          <div className="eyebrow">Fruits &amp; légumes de saison</div>
          <h1 className="screen-title">Calendrier saisonnier</h1>
        </div>
      </header>

      <div className="seasons-grid">
        {MONTHS.map((label, i) => {
          const month = i + 1;
          const produce = produceForMonth(month);
          const legumes = produce.filter((p) => p.kind === "legume");
          const fruits = produce.filter((p) => p.kind === "fruit");
          return (
            <section key={month} className={"season-card " + (month === current ? "is-current" : "")}
              style={{ "--season": SEASONS[monthSeason(month)].color }}>
              <header className="season-head">
                <span className="season-dot-lg"/>
                {label}
                {month === current && <span className="season-now">en ce moment</span>}
              </header>

              <div className="season-group">
                <div className="season-group-t">Légumes <span>{legumes.length}</span></div>
                <div className="season-chips">
                  {legumes.map((p) => (
                    <span key={p.id} className="produce-chip">
                      <span className="veggie-dot" style={{ background: p.color }}/>{p.name}
                    </span>
                  ))}
                  {legumes.length === 0 && <span className="season-empty">—</span>}
                </div>
              </div>

              <div className="season-group">
                <div className="season-group-t">Fruits <span>{fruits.length}</span></div>
                <div className="season-chips">
                  {fruits.map((p) => (
                    <span key={p.id} className="produce-chip">
                      <span className="veggie-dot" style={{ background: p.color }}/>{p.name}
                    </span>
                  ))}
                  {fruits.length === 0 && <span className="season-empty">—</span>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default SeasonsScreen;
