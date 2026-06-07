import { Icon } from "../icons.jsx";
import { MEALS, COURSES, weekRangeLabel } from "../data/index.js";
import { usePlanner } from "../state/planner.jsx";
import { useRecipes } from "../state/recipes.jsx";

const CompactScreen = () => {
  const { week, days, weekNumber, goToWeek, weekNotes, setWeekNote, lunchDays } = usePlanner();
  const { getRecipe } = useRecipes();
  const mealActive = (dayId, mealId) => mealId === "soir" || lunchDays.includes(dayId);

  // Liste des cours remplis d'un menu : [{ tag, name, time }]
  const coursesOf = (menu) => {
    if (!menu) return [];
    return COURSES.flatMap((c) => {
      const course = menu[c.id];
      if (!course) return [];
      if (course.type === "recipe") {
        const r = getRecipe(course.recipeId);
        return [{ tag: c.label, name: course.label || r?.name, time: r?.time }];
      }
      return [{ tag: c.label, name: course.text, time: null }];
    });
  };

  return (
    <div className="screen compact">
      <header className="screen-head">
        <div>
          <div className="eyebrow">{weekRangeLabel(weekNumber)}</div>
          <h1 className="screen-title">Menu (compact)</h1>
        </div>
        <div className="screen-actions">
          <div className="week-nav">
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber - 1)} aria-label="Semaine précédente"><Icon name="chevronL" size={16}/></button>
            <span className="week-nav-label">Semaine {weekNumber}</span>
            <button className="icon-btn ghost" onClick={() => goToWeek(weekNumber + 1)} aria-label="Semaine suivante"><Icon name="chevronR" size={16}/></button>
          </div>
          <button className="btn ghost"><Icon name="print" size={14}/> Imprimer</button>
          <button className="btn ghost"><Icon name="share" size={14}/> Partager</button>
        </div>
      </header>

      <div className="compact-body">
        <section className="compact-week">
          {days.map(d => (
            <article key={d.id} className="compact-day">
              <header className="compact-day-sep">
                <span className="cds-name">{d.label}</span>
                <span className="cds-date">{d.date}</span>
              </header>
              <div className="compact-day-meals">
                {MEALS.filter(m => mealActive(d.id, m.id)).map(m => {
                  const menu = week[`${d.id}-${m.id}`];
                  const courses = coursesOf(menu);
                  return (
                    <div key={m.id} className={"cm-meal " + (courses.length ? "" : "is-empty")}>
                      <span className="cm-meal-label">{m.label}</span>
                      {courses.length ? (
                        <div className="cm-lines">
                          {courses.map((c, idx) => (
                            <div key={idx} className="cm-line">
                              <span className="cm-name">{c.name}</span>
                              {c.time && <span className="cm-time">{c.time}′</span>}
                            </div>
                          ))}
                          {menu?.note && (
                            <div className="cm-note">
                              <Icon name="note" size={11}/>
                              {menu.note}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="cm-empty">— rien de prévu</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>

        <aside className="compact-aside">
          <div className="note-card">
            <div className="note-head">
              <Icon name="note" size={14}/>
              Notes de la semaine
            </div>
            <textarea
              value={weekNotes.weekly}
              onChange={(e) => setWeekNote("weekly", e.target.value)}
              placeholder="Ajustements, idées, choses à ne pas oublier…"
            />
          </div>

          <div className="note-card">
            <div className="note-head">
              <Icon name="basket" size={14}/>
              Prep-tips & courses
            </div>
            <textarea
              value={weekNotes.shopping}
              onChange={(e) => setWeekNote("shopping", e.target.value)}
              placeholder="Astuces de préparation à l'avance, où aller…"
            />
          </div>

          <div className="tip-card">
            <div className="tip-eyebrow">Astuce du dimanche</div>
            <textarea
              className="tip-input"
              value={weekNotes.tip}
              onChange={(e) => setWeekNote("tip", e.target.value)}
              placeholder="Une astuce de batch-cooking pour la semaine…"
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CompactScreen;
