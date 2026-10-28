import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { canBreed } from "@botanica/genetics";
import { PlantPreview } from "../components/PlantPreview";
import { QueryMessage } from "../components/QueryMessage";
import { api, loadAllParents } from "../lib/api";
import type { PlantDto } from "@botanica/shared";
function Parent({
  label,
  id,
  onChange,
  plants,
}: {
  label: string;
  id: string;
  onChange: (id: string) => void;
  plants: PlantDto[];
}) {
  const plant = plants.find((p) => p.id === id);
  return (
    <section className="parent-card">
      <label>
        {label}
        <select value={id} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose a saved plant</option>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      {plant ? (
        <>
          <PlantPreview
            phenotype={plant.phenotype}
            visualSeed={plant.visualSeed}
            stage="flowering"
            size={512}
          />
          <h2>{plant.name}</h2>
          <p>
            {plant.phenotype.pigment} · {plant.phenotype.leafShape} ·{" "}
            {plant.phenotype.leafPattern}
          </p>
          <span className="badge">
            Generation {plant.generation} · {plant.rarity.tier}
          </span>
          <Link className="text-link" to={"/plants/" + plant.id}>
            Inspect parent →
          </Link>
        </>
      ) : (
        <div className="parent-empty">Select a parent to see its traits.</div>
      )}
    </section>
  );
}
export function BreedingLab() {
  const parents = useQuery({ queryKey: ["parents"], queryFn: loadAllParents }),
    [a, setA] = useState(""),
    [b, setB] = useState(""),
    [cursor, setCursor] = useState<string | undefined>(),
    history = useQuery({
      queryKey: ["breeding", cursor],
      queryFn: () => api.events(cursor),
    }),
    client = useQueryClient();
  const key = useRef<{ pair: string; id: string } | null>(null);
  const cross = useMutation({
    mutationFn: api.cross,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["parents"] });
      void client.invalidateQueries({ queryKey: ["plants"] });
      void client.invalidateQueries({ queryKey: ["breeding"] });
    },
  });
  const list = parents.data ?? [],
    left = list.find((p) => p.id === a),
    right = list.find((p) => p.id === b);
  let message = "Choose two saved parents to check compatibility.",
    compatible = false;
  if (left && right) {
    if (a === b) message = "Select two different parent plants.";
    else {
      try {
        compatible = canBreed(left.speciesId, right.speciesId).compatible;
      } catch {
        compatible = false;
      }
      message = compatible
        ? "Compatible velvetleaf pair. The server will choose and save the child."
        : "These species have no approved compatibility or hybrid rule.";
    }
  }
  function choose(side: "A" | "B", id: string) {
    if (side === "A") setA(id);
    else setB(id);
    key.current = null;
    cross.reset();
  }
  function breed() {
    const pair = a + ":" + b;
    if (!key.current || key.current.pair !== pair)
      key.current = { pair, id: crypto.randomUUID() };
    cross.mutate({
      parentAId: a,
      parentBId: b,
      idempotencyKey: key.current.id,
    });
  }
  return (
    <>
      <section className="lab-heading">
        <div>
          <p className="eyebrow">The next generation</p>
          <h1>Let their traits meet.</h1>
          <p>
            Choose two saved plants. Inheritance, mutations and the child's
            identity are decided once by the server.
          </p>
        </div>
        <Link className="button-link secondary" to="/lab">
          Design a parent →
        </Link>
      </section>
      {parents.isPending ? (
        <QueryMessage loading />
      ) : parents.error ? (
        <QueryMessage
          error={parents.error}
          retry={() => void parents.refetch()}
        />
      ) : !list.length ? (
        <div className="empty">
          <h2>No saved parents yet</h2>
          <p>Design and save two plants in the laboratory.</p>
          <Link className="text-link" to="/lab">
            Open laboratory →
          </Link>
        </div>
      ) : (
        <>
          <div className="breeding-pair">
            <Parent
              label="Parent A"
              id={a}
              onChange={(id) => choose("A", id)}
              plants={list}
            />
            <div className="cross-symbol" aria-hidden="true">
              ×
            </div>
            <Parent
              label="Parent B"
              id={b}
              onChange={(id) => choose("B", id)}
              plants={list}
            />
          </div>
          <section className="cross-controls">
            <p role="status">{message}</p>
            <button
              onClick={breed}
              disabled={!compatible || cross.isPending || !!cross.data}
            >
              {cross.isPending
                ? "Crossing…"
                : cross.data
                  ? "Cross saved"
                  : "Breed selected parents"}
            </button>
            {cross.error && (
              <p className="error-text" role="alert">
                {cross.error.message} Retry uses the same request key.
              </p>
            )}
            {cross.data && (
              <button
                className="secondary"
                onClick={() => {
                  key.current = null;
                  cross.reset();
                }}
              >
                Start another cross
              </button>
            )}
          </section>
        </>
      )}
      {cross.data && (
        <section className="offspring-card" aria-labelledby="offspring-title">
          <PlantPreview
            phenotype={cross.data.plant.phenotype}
            visualSeed={cross.data.plant.visualSeed}
            stage="flowering"
            size={128}
          />
          <div>
            <p className="eyebrow">A new discovery</p>
            <h2 id="offspring-title">{cross.data.plant.name}</h2>
            <p>
              {cross.data.plant.phenotype.pigment} ·{" "}
              {cross.data.plant.phenotype.leafPattern} ·{" "}
              {cross.data.plant.rarity.tier}
            </p>
            <p>
              {cross.data.event.mutationEvents.length
                ? cross.data.event.mutationEvents.length +
                  " mutation events recorded."
                : "No mutations in this cross."}
            </p>
            <Link className="text-link" to={"/plants/" + cross.data.plant.id}>
              Inspect child & lineage →
            </Link>
          </div>
        </section>
      )}
      <section className="breeding-history">
        <div className="section-heading">
          <h2>The breeding journal</h2>
          {cursor && (
            <button className="secondary" onClick={() => setCursor(undefined)}>
              Latest crosses
            </button>
          )}
        </div>
        {history.isPending ? (
          <QueryMessage loading />
        ) : history.error ? (
          <QueryMessage
            error={history.error}
            retry={() => void history.refetch()}
          />
        ) : history.data?.items.length ? (
          <>
            <ol>
              {history.data.items.map((event) => (
                <li key={event.id}>
                  <div>
                    <Link to={"/plants/" + event.parentAId}>
                      Parent {event.parentAId.slice(0, 8)}
                    </Link>
                    <span> × </span>
                    <Link to={"/plants/" + event.parentBId}>
                      Parent {event.parentBId.slice(0, 8)}
                    </Link>
                  </div>
                  <Link to={"/plants/" + event.childId}>View child →</Link>
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString("en-GB")}
                  </time>
                </li>
              ))}
            </ol>
            {history.data.nextCursor && (
              <button
                className="secondary"
                onClick={() => setCursor(history.data!.nextCursor!)}
              >
                Older crosses
              </button>
            )}
          </>
        ) : (
          <div className="empty">
            <h3>The first cross is still to come</h3>
            <p>Every saved offspring will leave a trace here.</p>
          </div>
        )}
      </section>
    </>
  );
}
