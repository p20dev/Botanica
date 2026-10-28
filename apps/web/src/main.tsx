import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Leaf } from "lucide-react";
import { Lab } from "./pages/Lab";
import { BreedingLab } from "./pages/BreedingLab";
import { Collection } from "./pages/Collection";
import { PlantDetails } from "./pages/PlantDetails";
import { RenderGallery } from "./pages/RenderGallery";
import { BotanicalPlate } from "./components/BotanicalPlate";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./styles.css";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
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

function About() {
  return (
    <>
      <section className="hero">
        <div className="intro">
          <p className="eyebrow">Field notes / Plant Laboratory</p>
          <h1>Botany meets a little imagination.</h1>
          <p className="description">
            An illustrated breeding sandbox inspired by Mendelian genetics. The
            plants are fictional; the joy of discovering a new combination is
            yours.
          </p>
          <Link className="text-link" to="/lab">
            Begin a botanical study →
          </Link>
        </div>
        <figure>
          <BotanicalPlate />
          <figcaption>AN ORIGINAL BOTANICAL STUDY</figcaption>
        </figure>
      </section>
      <section className="about-notes">
        <article>
          <h2>Paired traits</h2>
          <p>
            Each of six loci carries two alleles. Dominance resolves their
            expression. A child inherits one allele from each saved parent, with
            small, recorded chances of mutation. This simplified game model is
            not a scientifically accurate botany simulator.
          </p>
        </article>
        <article>
          <h2>A traceable collection</h2>
          <p>
            Saved plants retain their genomes, versions, cosmetic seeds and
            ancestry. Rarity is a score derived from traits, separate from how
            often a trait occurs in your collection. Demonstration specimens are
            curated examples, clearly labeled.
          </p>
        </article>
        <article>
          <h2>A first chapter</h2>
          <p>
            Plant Laboratory is Botanica's first working module. Greenhouse
            progression, resources, research and accounts are future work. This
            local sandbox has no authentication and is not ready for public
            internet use.
          </p>
        </article>
      </section>
    </>
  );
}
function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById("main")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [pathname]);
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
            Plant Laboratory<small>BOTANICA / PLANT LABORATORY</small>
          </span>
        </NavLink>
        <nav aria-label="Main navigation">
          {[
            ["lab", "Laboratory"],
            ["breed", "Breeding"],
            ["gallery", "Collection"],
            ["about", "Field notes"],
          ].map(([key, label]) => (
            <NavLink key={key} to={"/" + key}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Navigate to="/lab" replace />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/breed" element={<BreedingLab />} />
          <Route path="/gallery" element={<Collection />} />
          <Route path="/plants/:id" element={<PlantDetails />} />
          <Route path="/studies" element={<RenderGallery />} />
          <Route path="/about" element={<About />} />
          <Route
            path="*"
            element={
              <section className="empty">
                <h1>Page not found</h1>
                <Link className="text-link" to="/lab">
                  Return to the laboratory →
                </Link>
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
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
