import { useState } from "react";
import { Icon } from "./icons.jsx";
import Sidebar from "./components/Sidebar.jsx";
import PlanningScreen from "./components/PlanningScreen.jsx";
import LibraryScreen from "./components/LibraryScreen.jsx";
import CompactScreen from "./components/CompactScreen.jsx";
import ShoppingScreen from "./components/ShoppingScreen.jsx";
import DashboardScreen from "./components/DashboardScreen.jsx";
import TasksScreen from "./components/TasksScreen.jsx";
import SeasonsScreen from "./components/SeasonsScreen.jsx";
import CalendarScreen from "./components/CalendarScreen.jsx";
import BagsScreen from "./components/BagsScreen.jsx";
import ChoresScreen from "./components/ChoresScreen.jsx";
import { PlannerProvider } from "./state/planner.jsx";
import { RecipesProvider } from "./state/recipes.jsx";
import { TasksProvider } from "./state/tasks.jsx";
import { AppointmentsProvider } from "./state/appointments.jsx";
import { KitsProvider } from "./state/kits.jsx";
import { TripsProvider } from "./state/trips.jsx";
import { ChoresProvider } from "./state/chores.jsx";

const TWEAKS = {
  planningLayout: "grid",
  cardStyle: "comfortable",
  density: "comfortable",
};

const PlaceholderScreen = ({ route, onNav }) => {
  const labels = {
    dashboard: "Tableau de bord",
    history: "Historique",
  };
  return (
    <div className="screen placeholder">
      <header className="screen-head">
        <div>
          <div className="eyebrow">Aperçu — non maquetté</div>
          <h1 className="screen-title">{labels[route]}</h1>
        </div>
      </header>
      <div className="placeholder-card">
        <Icon name="sparkle" size={20}/>
        <p>
          Cet écran n'est pas inclus dans cette exploration.
          Quatre écrans clés sont maquettés en hi-fi :
        </p>
        <div className="placeholder-actions">
          <button className="btn primary" onClick={() => onNav("library")}>Bibliothèque</button>
          <button className="btn ghost" onClick={() => onNav("planning")}>Menus</button>
          <button className="btn ghost" onClick={() => onNav("compact")}>Menu (compact)</button>
          <button className="btn ghost" onClick={() => onNav("shopping")}>Liste de courses</button>
        </div>
      </div>
    </div>
  );
};

const NAV_KEY = "wmenu.nav.collapsed.v1";

const App = () => {
  const [route, setRoute] = useState("library");
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem(NAV_KEY) === "1"; } catch { return false; }
  });
  const toggleCollapse = () => setNavCollapsed((v) => {
    const next = !v;
    try { localStorage.setItem(NAV_KEY, next ? "1" : "0"); } catch { /* ignore */ }
    return next;
  });

  const KNOWN = ["dashboard", "calendar", "planning", "library", "compact", "shopping", "tasks", "seasons", "bags", "chores"];
  const go = (r) => { setRoute(r); setNavOpen(false); };
  return (
    <RecipesProvider>
    <PlannerProvider>
    <TasksProvider>
    <AppointmentsProvider>
    <KitsProvider>
    <TripsProvider>
    <ChoresProvider>
      <div className={"app" + (navCollapsed ? " nav-collapsed" : "")} data-screen-label={`route-${route}`}>
        <button className="nav-expand-btn" onClick={toggleCollapse} aria-label="Afficher le menu" title="Afficher le menu">
          <Icon name="menu" size={20}/>
        </button>
        <header className="topbar">
          <button className="topbar-burger" onClick={() => setNavOpen(true)} aria-label="Menu">
            <Icon name="menu" size={22}/>
          </button>
          <div className="topbar-brand">
            <span className="topbar-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19c0-7 5-12 14-13-1 8-6 13-13 13"/><path d="M5 19c2-4 6-7 10-8"/></svg>
            </span>
            Cellina's Home
          </div>
        </header>
        {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)}/>}
        <Sidebar active={route} onNav={go} open={navOpen} onCollapse={toggleCollapse}/>
        <main className="main">
          {route === "dashboard" && <DashboardScreen onNav={setRoute} />}
          {route === "calendar" && <CalendarScreen />}
          {route === "planning" && <PlanningScreen tweaks={TWEAKS} />}
          {route === "library" && <LibraryScreen />}
          {route === "compact" && <CompactScreen />}
          {route === "shopping" && <ShoppingScreen />}
          {route === "tasks" && <TasksScreen />}
          {route === "seasons" && <SeasonsScreen />}
          {route === "bags" && <BagsScreen />}
          {route === "chores" && <ChoresScreen />}
          {!KNOWN.includes(route) && (
            <PlaceholderScreen route={route} onNav={setRoute}/>
          )}
        </main>
      </div>
    </ChoresProvider>
    </TripsProvider>
    </KitsProvider>
    </AppointmentsProvider>
    </TasksProvider>
    </PlannerProvider>
    </RecipesProvider>
  );
};

export default App;
