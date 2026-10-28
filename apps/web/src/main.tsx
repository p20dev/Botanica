import { RenderLab } from "./pages/RenderLab";
import { RenderGallery } from "./pages/RenderGallery";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Leaf,
  ArrowUpRight,
  FlaskConical,
  Sprout,
  Images,
  BookOpen,
} from "lucide-react";
import "./styles.css";
const queryClient = new QueryClient();
const pages = {
  lab: {
    label: "Laboratory",
    eyebrow: "A place for possibility",
    title: "Small seeds. Endless possibilities.",
    description:
      "A botanical cabinet for curious minds. Explore the art of growing, the patterns of inheritance, and the delight of something unexpected.",
    empty: "Your workbench is taking root",
    detail:
      "The laboratory is ready for its first species. Genome controls and live plant previews arrive in the next milestones.",
    icon: FlaskConical,
  },
  breed: {
    label: "Breeding",
    eyebrow: "The next generation",
    title: "Every cross begins a new story.",
    description:
      "Bring two compatible plants together and follow the traits they pass on.",
    empty: "No parents to pair yet",
    detail:
      "Saved parent plants and authoritative breeding will arrive in milestone M3.",
    icon: Sprout,
  },
  gallery: {
    label: "Collection",
    eyebrow: "Your living archive",
    title: "A collection worth cultivating.",
    description:
      "A home for each discovery, from familiar greens to the wonderfully unusual.",
    empty: "Room for your first discovery",
    detail:
      "Your saved plants will appear here. The collection gallery arrives in milestone M4.",
    icon: Images,
  },
  about: {
    label: "Field notes",
    eyebrow: "About this experiment",
    title: "Botany meets a little imagination.",
    description:
      "Plant Laboratory is the first chapter of Botanica, a future plant-breeding idle game.",
    empty: "Fictional genetics, real curiosity",
    detail:
      "This educational game uses simplified, fictional Mendelian genetics. It is not a scientifically accurate botany simulator. This local sandbox has no accounts yet.",
    icon: BookOpen,
  },
};
function BotanicalPlate() {
  return (
    <svg
      viewBox="0 -20 480 530"
      role="img"
      aria-label="Original botanical study of a leafy plant in a terracotta pot"
    >
      <defs>
        <linearGradient id="leaf" x2="1" y2="1">
          <stop stopColor="#718c58" />
          <stop offset="1" stopColor="#284e3a" />
        </linearGradient>
      </defs>
      <circle cx="246" cy="231" r="172" fill="#e6e9d7" />
      <circle
        cx="246"
        cy="231"
        r="151"
        fill="none"
        stroke="#b9c6a8"
        strokeDasharray="2 8"
      />
      <ellipse cx="242" cy="458" rx="95" ry="12" fill="#283c2b" opacity=".09" />
      <path
        d="M239 362 Q225 263 252 108 M238 321 L171 251 M241 275 L315 209 M244 224 L199 160 M247 178 L297 127"
        fill="none"
        stroke="#486345"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {[
        [171, 251, -52],
        [315, 209, 45],
        [199, 160, -41],
        [297, 127, 35],
        [252, 108, 0],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d="M0 8 C-67-18-58-92 0-113 C53-81 56-22 0 8Z"
            fill="url(#leaf)"
            stroke="#486345"
            strokeWidth="1.5"
          />
          <path
            d="M0 6 Q-7-47 0-100 M-3-30 L-32-57 M-4-49 L27-75 M-3-66 L-24-84"
            fill="none"
            stroke="#b9c69a"
            strokeWidth="1.6"
          />
          <path
            d="M-12-79 Q-38-54-26-30"
            fill="none"
            stroke="#c7d1a6"
            strokeWidth="7"
            opacity=".15"
          />
        </g>
      ))}
      <path d="M181 363 L195 444 Q240 464 286 444 L301 363Z" fill="#b77659" />
      <path d="M195 380 L205 438 Q216 444 224 444 L216 380" fill="#cc9171" />
      <path
        d="M181 363 Q241 347 301 363 L301 379 Q239 394 181 379Z"
        fill="#cc9474"
      />
      <ellipse cx="241" cy="362" rx="59" ry="10" fill="#765a40" />
      <path d="M240 363 L239 341" stroke="#486345" strokeWidth="6" />
      <text x="38" y="486" fill="#6a7c70" fontFamily="Georgia" fontSize="12">
        Fig. 01 — A study in green
      </text>
    </svg>
  );
}
function Health() {
  const result = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const r = await fetch("/health");
      if (!r.ok) throw new Error("Unavailable");
      return r.json() as Promise<{ status: string }>;
    },
    refetchInterval: 30000,
    retry: 1,
  });
  return (
    <span className="health" role="status">
      <span className={result.isSuccess ? "dot online" : "dot"} />
      {result.isPending
        ? "Connecting to laboratory"
        : result.isError
          ? "Laboratory connection unavailable"
          : "Laboratory online"}
    </span>
  );
}
function Page({ page }: { page: keyof typeof pages }) {
  const p = pages[page];
  const Icon = p.icon;
  return (
    <>
      <section className="hero">
        <div className="intro">
          <p className="eyebrow">{p.eyebrow}</p>
          <h1>{p.title}</h1>
          <p className="description">{p.description}</p>
          <div className="edition">
            <span>PLANT LABORATORY</span>
            <span>Local sandbox · No. 001</span>
          </div>
        </div>
        <figure>
          <BotanicalPlate />
          <figcaption>BOTANICAL STUDY / ILLUSTRATED SHELL ART</figcaption>
        </figure>
      </section>
      <section className="workbench" aria-labelledby="workspace-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{p.label}</p>
            <h2 id="workspace-title">
              {page === "lab" ? "The workbench" : p.label}
            </h2>
          </div>
          <span className="badge">M2 · Foundations</span>
        </div>
        <div className="empty">
          <span className="icon">
            <Icon size={25} strokeWidth={1.4} />
          </span>
          <h3>{p.empty}</h3>
          <p>{p.detail}</p>
          {page === "lab" && (
            <NavLink to="/about" className="text-link">
              Read the field notes <ArrowUpRight size={16} />
            </NavLink>
          )}
        </div>
      </section>
    </>
  );
}
function App() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header>
        <NavLink to="/lab" className="brand" aria-label="Plant Laboratory home">
          <span className="brand-icon">
            <Leaf size={25} />
          </span>
          <span>
            Plant Laboratory<small>BOTANICA / EXPERIMENT NO. 001</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          {Object.entries(pages).map(([key, p]) => (
            <NavLink key={key} to={`/${key}`}>
              {p.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main">
        <Routes>
          <Route path="/" element={<Navigate to="/lab" replace />} />
          {Object.keys(pages).map((key) => (
            <Route
              key={key}
              path={`/${key}`}
              element={
                key === "lab" ? (
                  <RenderLab />
                ) : key === "gallery" ? (
                  <RenderGallery />
                ) : (
                  <Page page={key as keyof typeof pages} />
                )
              }
            />
          ))}
          <Route
            path="*"
            element={
              <section className="empty">
                <h1>Page not found</h1>
                <NavLink to="/lab">Return to the laboratory</NavLink>
              </section>
            }
          />
        </Routes>
      </main>
      <footer>
        <span>Rooted in curiosity. Grown with care.</span>
        <Health />
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
