import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Leaf,
  House,
  ShoppingBasket,
  Flower2,
  GitBranch,
  Users,
  BookOpen,
  FlaskConical,
  NotebookPen,
  Settings as SettingsIcon,
} from "lucide-react";
import { Lab } from "./pages/Lab";
import { BreedingLab } from "./pages/BreedingLab";
import { Collection } from "./pages/Collection";
import { PlantDetails } from "./pages/PlantDetails";
import { RenderGallery } from "./pages/RenderGallery";
import {
  Greenhouse,
  Shop,
  Quests,
  Research,
  Workers,
  Settings,
  Examples,
  ReferenceDetails,
} from "./pages/GamePages";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { GameProvider, useGame } from "./lib/game";
import "./styles.css";
import "./game.css";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const links = [
  ["/", "Greenhouse", House],
  ["/shop", "Shop", ShoppingBasket],
  ["/gallery", "Collection", Flower2],
  ["/breed", "Breeding", GitBranch],
  ["/workers", "Workers", Users],
  ["/research", "Research", BookOpen],
  ["/quests", "Quests", NotebookPen],
  ["/lab", "Advanced Lab", FlaskConical],
  ["/settings", "Account", SettingsIcon],
] as const;
function App() {
  const game = useGame(),
    client = useQueryClient(),
    { pathname } = useLocation(),
    quest = game.quests.find((q) => !q.claimed);
  useEffect(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.motion =
      localStorage.getItem("botanica-motion") ?? "system";
  }, []);
  return (
    <div className="game-shell">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <aside className="game-rail">
        <Link className="game-brand" to="/">
          <Leaf />
          <span>
            Botanica<small>THE GREENHOUSE JOURNAL</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/examples" className="rail-note">
          ❦ Reference herbarium
        </Link>
        <p className="rail-motto">
          Rooted in curiosity.
          <br />
          Grown with care.
        </p>
      </aside>
      <div className="game-body">
        <header className="game-hud">
          <div className="hud-player">
            <span className="avatar">
              {game.player.username.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{game.player.username}</strong>
              <span>
                Level {game.player.level} · {game.player.xp} XP
              </span>
              <progress
                aria-label="Level experience"
                value={game.player.xp}
                max={game.player.nextLevelXp || game.player.xp || 1}
              />
            </div>
          </div>
          <div className="hud-coins">
            <small>COIN PURSE</small>
            <strong>◈ {game.player.coins.toLocaleString()}</strong>
          </div>
          <div className="hud-seeds">
            <small>SEED POUCH</small>
            <strong>
              ❧ {Object.values(game.seeds).reduce((a, b) => a + b, 0)}
            </strong>
            <span>
              {game.seeds.starter} starter · {game.seeds.uncommon} uncommon ·{" "}
              {game.seeds.rare} rare
            </span>
          </div>
          <Link to="/quests" className="quest-pin">
            <small>NEXT IN YOUR NOTEBOOK</small>
            <strong>{quest?.name ?? "A notebook full of memories"}</strong>
            <span>
              {quest
                ? quest.progress +
                  " / " +
                  quest.target +
                  " · " +
                  (quest.progress >= quest.target
                    ? "Reward ready →"
                    : "Keep growing →")
                : "All goals complete"}
            </span>
          </Link>
        </header>
        {game.pendingWork && (
          <div className="pending-banner" role="status">
            Your team has more offline work to process.{" "}
            <button
              onClick={() =>
                void client.invalidateQueries({ queryKey: ["game"] })
              }
            >
              Process next batch
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Greenhouse />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/gallery" element={<Collection />} />
            <Route path="/breed" element={<BreedingLab />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/research" element={<Research />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/lab"
              element={
                <>
                  <div className="study-notice">
                    Advanced studies are a creative sandbox. Saved studies keep
                    their genomes and artwork, but cannot be sold or used for
                    game rewards. <Link to="/">Grow game plants →</Link>
                  </div>
                  <Lab />
                </>
              }
            />
            <Route path="/plants/:id" element={<PlantDetails />} />
            <Route path="/studies" element={<RenderGallery />} />
            <Route path="/examples" element={<Examples />} />
            <Route path="/examples/:id" element={<ReferenceDetails />} />
            <Route path="/about" element={<Settings />} />
            <Route
              path="*"
              element={
                <section className="empty">
                  <h1>Path not found</h1>
                  <Link to="/">Return to your greenhouse →</Link>
                </section>
              }
            />
          </Routes>
        </main>
        <footer className="game-footer">
          Botanica · No rush. Something good is growing.
          <Link to="/studies">Botanical studies</Link>
        </footer>
      </div>
      <nav className="mobile-game-nav" aria-label="Quick navigation">
        {links.slice(0, 5).map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppErrorBoundary>
          <GameProvider>
            <App />
          </GameProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
