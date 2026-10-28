import { useDeferredValue } from "react";
import {
  useInfiniteQuery,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { PlantPreview } from "../components/PlantPreview";
import { PlantInspector } from "../components/PlantInspector";
import { QueryMessage } from "../components/QueryMessage";
import { api } from "../lib/api";
const tiers = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
export function Collection() {
  const [search, setSearch] = useSearchParams();
  const q = useDeferredValue(search.get("q") ?? ""),
    species = search.get("species") ?? "",
    pigment = search.get("pigment") ?? "",
    pattern = search.get("pattern") ?? "",
    rarity = search.get("rarity") ?? "",
    sort = search.get("sort") ?? "newest",
    selected = search.get("plant");
  const filters = { q, species, pigment, pattern, rarity, sort };
  const plants = useInfiniteQuery({
    queryKey: ["plants", filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api.plants(
        new URLSearchParams(
          Object.fromEntries(
            Object.entries({
              ...filters,
              limit: "24",
              cursor: pageParam ?? "",
            }).filter(([, v]) => v !== ""),
          ),
        ).toString(),
      ),
    getNextPageParam: (page) => page.nextCursor,
    placeholderData: keepPreviousData,
  });
  const stats = useQuery({
    queryKey: ["collection-stats"],
    queryFn: api.stats,
  });
  const items = plants.data?.pages.flatMap((p) => p.items) ?? [],
    total = plants.data?.pages[0]?.total ?? 0;
  function update(key: string, value: string) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next, { replace: key === "q" });
  }
  function clear() {
    const next = new URLSearchParams();
    if (selected) next.set("plant", selected);
    setSearch(next);
  }
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">Your living archive</p>
          <h1>A collection worth cultivating.</h1>
          <p>
            {stats.data
              ? stats.data.total +
                " saved plants, each with its own genome and traceable story."
              : "Your saved plants, their inherited traits and the stories behind them."}
          </p>
        </div>
        <Link className="button-link secondary" to="/">
          Grow a plant →
        </Link>
      </section>
      <section className="collection-filters" aria-label="Collection filters">
        <label className="search-filter">
          Search plants
          <input
            type="search"
            placeholder="Name, ID, pigment or pattern"
            value={search.get("q") ?? ""}
            maxLength={80}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <label>
          Species
          <select
            value={species}
            onChange={(e) => update("species", e.target.value)}
          >
            <option value="">All species</option>
            <option value="velvetleaf">Velvetleaf</option>
          </select>
        </label>
        <label>
          Pigment
          <select
            value={pigment}
            onChange={(e) => update("pigment", e.target.value)}
          >
            <option value="">All pigments</option>
            {["green", "purple", "red", "yellow"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Pattern
          <select
            value={pattern}
            onChange={(e) => update("pattern", e.target.value)}
          >
            <option value="">All patterns</option>
            {["solid", "variegated", "marbled"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Rarity
          <select
            value={rarity}
            onChange={(e) => update("rarity", e.target.value)}
          >
            <option value="">All tiers</option>
            {tiers.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Sort plants
          <select value={sort} onChange={(e) => update("sort", e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="rarity">Rarity score</option>
          </select>
        </label>
      </section>
      <section className="collection-toolbar">
        <p role="status">
          {plants.isFetching && !plants.isFetchingNextPage
            ? "Updating collection…"
            : `Showing ${items.length} of ${total} plants`}
        </p>
        <button className="link-button" onClick={clear}>
          Clear filters
        </button>
        <Link className="text-link" to="/studies">
          Explore render studies →
        </Link>
      </section>
      {plants.isPending ? (
        <QueryMessage loading />
      ) : plants.error ? (
        <QueryMessage
          error={plants.error}
          retry={() => void plants.refetch()}
        />
      ) : items.length ? (
        <div className="collection-grid" aria-busy={plants.isPlaceholderData}>
          {items.map((p) => (
            <article className="collection-card" key={p.id}>
              <button
                className="open-specimen"
                onClick={() => update("plant", p.id)}
                aria-label={"Inspect " + p.name}
              >
                <div className="card-top">
                  <span
                    className={
                      "rarity-badge rarity-" + p.rarity.tier.toLowerCase()
                    }
                  >
                    {p.rarity.tier}
                  </span>
                  <span>
                    {p.isFavorite ? "★ " : ""}
                    {p.isProtected ? "Protected · " : ""}Gen {p.generation}
                  </span>
                </div>
                <PlantPreview
                  phenotype={p.phenotype}
                  visualSeed={p.visualSeed}
                  stage="flowering"
                  size={512}
                  label={p.name}
                />
                <h2>{p.name}</h2>
                <p>
                  {p.phenotype.pigment} · {p.phenotype.leafShape}
                </p>
                <div className="collection-card-footer">
                  <span>{p.phenotype.leafPattern}</span>
                  <span>
                    {p.firstDiscovery
                      ? "First discovery"
                      : p.gameEligible && p.creationSource !== "bred"
                        ? "Greenhouse grown"
                        : p.creationSource === "demo"
                          ? "Demo study"
                          : p.creationSource === "bred"
                            ? "Bred offspring"
                            : "Designed founder"}
                  </span>
                </div>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h2>No plants match these filters</h2>
          <p>
            Try a different trait or clear your search to see the whole
            collection. Harvest a crop in your greenhouse to add your first
            specimen.
          </p>
          <button className="secondary" onClick={clear}>
            Show all plants
          </button>
        </div>
      )}
      {plants.hasNextPage && (
        <div className="load-more">
          <button
            onClick={() => void plants.fetchNextPage()}
            disabled={plants.isFetchingNextPage || plants.isPlaceholderData}
          >
            {plants.isFetchingNextPage ? "Loading…" : "Load more plants"}
          </button>
        </div>
      )}
      {selected && (
        <PlantInspector
          id={selected}
          onClose={() => update("plant", "")}
          onSelect={(id) => update("plant", id)}
        />
      )}
    </>
  );
}
