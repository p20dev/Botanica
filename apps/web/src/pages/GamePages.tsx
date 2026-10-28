import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameWorker, SeedType, WorkerPolicy } from "@botanica/shared";
import { useGame, useGameAction, ActionFeedback } from "../lib/game";
import { loadAllParents, request } from "../lib/api";
import { PlantPreview } from "../components/PlantPreview";
import { PlantRecord } from "../components/PlantRecord";
export function GameHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="game-heading">
      <p className="eyebrow">Botanica / grow at your own pace</p>
      <h1>{title}</h1>
      <p>{note}</p>
    </div>
  );
}
export function Greenhouse() {
  const client = useQueryClient(),
    lastReadyCheck = useRef(0);
  const game = useGame(),
    [selected, setSelected] = useState(""),
    [seed, setSeed] = useState<SeedType>("starter"),
    [now, setNow] = useState(Date.now()),
    action = useGameAction();
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const house =
      game.greenhouses.find((h) => h.id === selected) ?? game.greenhouses[0],
    offset = useMemo(
      () => new Date(game.serverNow).getTime() - Date.now(),
      [game.serverNow],
    );
  useEffect(() => {
    if (now - lastReadyCheck.current < 1000) return;
    if (
      house.plants.some(
        (slot) =>
          slot.readyAt &&
          !slot.ready &&
          new Date(slot.readyAt).getTime() <= now + offset,
      )
    ) {
      lastReadyCheck.current = now;
      void client.invalidateQueries({ queryKey: ["game"] });
    }
  }, [now, offset, house, client]);
  return (
    <>
      <GameHeading
        title="A good day to grow."
        note="Plant a seed. Make a discovery. Build a greenhouse that's yours."
      />
      <div className="greenhouse-toolbar">
        <div className="house-tabs">
          {game.greenhouses.map((h) => (
            <button
              key={h.id}
              className={house.id === h.id ? "" : "secondary"}
              onClick={() => setSelected(h.id)}
            >
              {h.name}
            </button>
          ))}
        </div>
        <label>
          Plant with
          <select
            aria-label="Plant with"
            value={seed}
            onChange={(e) => setSeed(e.target.value as SeedType)}
          >
            {game.seedInfo.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {game.seeds[s.id]} available
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="glasshouse">
        <div className="glasshouse-roof" aria-hidden="true">
          <span>BOTANICA · {house.name.toUpperCase()}</span>
        </div>
        <div className="house-equipment">
          <span>{house.slots} growing slots</span>
          <span>
            {house.lamp ? "☀ Grow lamp · 10% faster" : "Natural light"} ·{" "}
            {house.irrigation ? "Irrigation installed" : "Hand tended"}
          </span>
        </div>
        <div className="growing-bench">
          {house.plants.map((slot) => {
            const remaining = slot.readyAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(slot.readyAt).getTime() - now - offset) / 1000,
                    ),
                  )
                : 0,
              ready = slot.ready,
              progress =
                slot.readyAt && slot.plantedAt
                  ? Math.min(
                      100,
                      Math.max(
                        0,
                        (100 *
                          (now + offset - new Date(slot.plantedAt).getTime())) /
                          (new Date(slot.readyAt).getTime() -
                            new Date(slot.plantedAt).getTime()),
                      ),
                    )
                  : 0;
            return (
              <article
                key={slot.id}
                className={
                  "growing-slot " +
                  (ready ? "ready" : slot.seedType ? "growing" : "empty-slot")
                }
              >
                <div className="slot-top">
                  <span>№ {String(slot.slotNo + 1).padStart(2, "0")}</span>
                  <span>
                    {ready
                      ? "Ready to harvest"
                      : slot.seedType
                        ? "Growing"
                        : "Open soil"}
                  </span>
                </div>
                <div className="slot-art">
                  {slot.phenotype ? (
                    <PlantPreview
                      phenotype={slot.phenotype}
                      visualSeed={slot.visualSeed!}
                      stage={
                        ready
                          ? "flowering"
                          : progress < 40
                            ? "seedling"
                            : "juvenile"
                      }
                      size={512}
                    />
                  ) : (
                    <svg
                      viewBox="0 0 200 200"
                      role="img"
                      aria-label="Empty terracotta growing pot"
                    >
                      <ellipse
                        cx="100"
                        cy="171"
                        rx="65"
                        ry="10"
                        fill="#162c20"
                        opacity=".2"
                      />
                      <path d="M54 91h92l-13 69q-33 14-66 0Z" fill="#b87550" />
                      <path
                        d="M51 86q49-19 98 0v17q-49 19-98 0Z"
                        fill="#d59a70"
                      />
                      <ellipse
                        cx="100"
                        cy="86"
                        rx="43"
                        ry="10"
                        fill="#493f2d"
                      />
                      <path
                        d="M100 70V43m-13 14 13 13 13-13"
                        fill="none"
                        stroke="#839272"
                        strokeWidth="3"
                      />
                    </svg>
                  )}
                </div>
                <div className="slot-info">
                  {slot.seedType ? (
                    <>
                      <progress
                        max={100}
                        value={progress}
                        aria-label={"Growth of slot " + (slot.slotNo + 1)}
                      />
                      <p>
                        {ready
                          ? "Your next discovery is waiting."
                          : `${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`}
                      </p>
                      <button
                        disabled={
                          action.isPending || !ready || game.pendingWork
                        }
                        onClick={() =>
                          action.mutate({
                            action: "harvest",
                            data: { slotId: slot.id },
                          })
                        }
                      >
                        {ready ? "Harvest plant" : "Taking root…"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>
                        {game.seeds[seed]
                          ? "A little room for possibility."
                          : "No seeds of this type. Try starter or visit the shop."}
                      </p>
                      <button
                        disabled={
                          action.isPending ||
                          !game.seeds[seed] ||
                          game.pendingWork
                        }
                        onClick={() =>
                          action.mutate({
                            action: "plant",
                            data: { slotId: slot.id, seedType: seed },
                          })
                        }
                      >
                        Plant {seed} seed
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <ActionFeedback action={action} />
      {action.data?.plantId && (
        <div
          className={
            "discovery-reveal " +
            (action.data.discovered ? "new-discovery" : "")
          }
        >
          <h2>
            {action.data.discovered
              ? "A first of its kind."
              : "A new leaf in your collection."}
          </h2>
          <p>
            Your specimen is safe in the collection. Each harvest recycles one
            starter seed.
          </p>
          <Link className="button-link" to={"/plants/" + action.data.plantId}>
            Meet your plant →
          </Link>
        </div>
      )}
      <div className="game-tip">
        <span>❦</span>
        <p>
          Keep a favorite or sell a specimen to grow your coin purse. Crops
          never wilt while you're away.
        </p>
        <Link className="text-link" to="/gallery">
          Your collection →
        </Link>
      </div>
    </>
  );
}
export function Shop() {
  const game = useGame(),
    action = useGameAction(),
    [houseId, setHouse] = useState(game.greenhouses[0].id),
    house = game.greenhouses.find((h) => h.id === houseId)!;
  return (
    <>
      <GameHeading
        title="The potting shop"
        note="Known seeds, useful tools, a little more room to grow. All prices are in coins."
      />
      <label className="house-select">
        Equip greenhouse
        <select
          aria-label="Equip greenhouse"
          value={houseId}
          onChange={(e) => setHouse(e.target.value)}
        >
          {game.greenhouses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </label>
      <div className="game-grid">
        {game.shop.map((item) => {
          const cost =
              item.id === "slot"
                ? (house.nextSlotCost ?? item.cost)
                : item.cost,
            reason =
              item.disabledReason ??
              (item.id === "slot" && house.slots >= 12
                ? "All 12 slots installed"
                : (item.id === "lamp" && house.lamp) ||
                    (item.id === "irrigation" && house.irrigation)
                  ? "Already installed"
                  : game.player.coins < cost
                    ? "Not enough coins"
                    : game.pendingWork
                      ? "Finish offline work first"
                      : null);
          return (
            <article className="game-card" key={item.id}>
              <span className="item-glyph" aria-hidden="true">
                {item.id.startsWith("seed")
                  ? "❧"
                  : item.id === "greenhouse"
                    ? "⌂"
                    : "✧"}
              </span>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
              <p className="coin-price">◈ {cost} coins</p>
              <button
                disabled={!!reason || action.isPending}
                onClick={() =>
                  action.mutate({
                    action: "purchase",
                    data: { itemId: item.id, houseId },
                  })
                }
              >
                {reason ?? "Purchase"}
              </button>
            </article>
          );
        })}
      </div>
      <ActionFeedback action={action} />
      <p className="panel-note">
        Seed packs use fixed founder genomes, described above; no random rarity
        roll. Starter seeds are guaranteed back at every harvest.
      </p>
    </>
  );
}
export function Quests() {
  const game = useGame(),
    action = useGameAction();
  return (
    <>
      <GameHeading
        title="A growing notebook"
        note="Small accomplishments, lasting rewards. Claim them whenever you like."
      />
      <div className="game-grid">
        {game.quests.map((q) => (
          <article
            key={q.id}
            className={"game-card " + (q.claimed ? "completed" : "")}
          >
            <p className="eyebrow">{q.claimed ? "Completed" : "Field goal"}</p>
            <h2>{q.name}</h2>
            <p>{q.description}</p>
            <progress value={q.progress} max={q.target} aria-label={q.name} />
            <p>
              {q.progress} / {q.target} · ◈ {q.coins} · {q.xp} XP
            </p>
            <button
              disabled={
                q.claimed ||
                q.progress < q.target ||
                action.isPending ||
                game.pendingWork
              }
              onClick={() =>
                action.mutate({ action: "claim", data: { questId: q.id } })
              }
            >
              {q.claimed
                ? "Reward collected"
                : q.progress < q.target
                  ? "In progress"
                  : "Claim reward"}
            </button>
          </article>
        ))}
      </div>
      <ActionFeedback action={action} />
    </>
  );
}
export function Research() {
  const game = useGame(),
    action = useGameAction();
  return (
    <>
      <GameHeading
        title="The botanist's desk"
        note="A few thoughtful improvements. Research lasts for your whole collection."
      />
      <div className="game-grid">
        {game.research.map((item) => (
          <article key={item.id} className="game-card">
            <p className="eyebrow">
              Level {item.level} ·{" "}
              {item.owned ? "Learned" : "Botanical research"}
            </p>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <p className="coin-price">◈ {item.cost} coins</p>
            <button
              disabled={
                !!item.disabledReason ||
                game.player.coins < item.cost ||
                action.isPending ||
                game.pendingWork
              }
              onClick={() =>
                action.mutate({
                  action: "research",
                  data: { researchId: item.id },
                })
              }
            >
              {item.disabledReason ??
                (game.player.coins < item.cost
                  ? "Not enough coins"
                  : "Research")}
            </button>
          </article>
        ))}
      </div>
      <ActionFeedback action={action} />
    </>
  );
}
function Assignment({ worker }: { worker: GameWorker }) {
  const game = useGame(),
    action = useGameAction(),
    parents = useQuery({ queryKey: ["parents"], queryFn: loadAllParents }),
    [house, setHouse] = useState(worker.greenhouseId ?? game.greenhouses[0].id),
    [enabled, setEnabled] = useState(worker.enabled),
    [policy, setPolicy] = useState<WorkerPolicy>({
      mode: worker.kind === "gardener" ? "repeat_crop" : "repeat_cross",
      seedType: "starter",
      autoSell: false,
      reserveCoins: 100,
      ...(worker.policy as Partial<WorkerPolicy>),
    });
  const update = (patch: Partial<WorkerPolicy>) =>
    setPolicy({ ...policy, ...patch });
  return (
    <article className="game-card worker-card">
      <p className="eyebrow">
        {worker.enabled ? "Working" : "Paused"} · one interval /{" "}
        {worker.intervalSeconds}s
      </p>
      <h2>
        {worker.kind === "gardener" ? "Junior gardener" : "Breeding specialist"}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.mutate({
            action: "assign",
            data: { workerId: worker.id, greenhouseId: house, enabled, policy },
          });
        }}
      >
        <label>
          Greenhouse
          <select
            aria-label="Greenhouse"
            value={house}
            onChange={(e) => setHouse(e.target.value)}
          >
            {game.greenhouses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Policy
          <select
            aria-label="Policy"
            value={policy.mode}
            onChange={(e) =>
              update({ mode: e.target.value as WorkerPolicy["mode"] })
            }
          >
            {worker.kind === "gardener" ? (
              <option value="repeat_crop">Harvest & replant</option>
            ) : (
              <>
                <option value="repeat_cross">Repeat parent cross</option>
                <option
                  value="target_trait"
                  disabled={
                    !game.research.find((r) => r.id === "selection")?.owned
                  }
                >
                  Target traits · level 10 research
                </option>
              </>
            )}
          </select>
        </label>
        {worker.kind === "gardener" ? (
          <label>
            Seed to plant
            <select
              aria-label="Seed to plant"
              value={policy.seedType}
              onChange={(e) => update({ seedType: e.target.value as SeedType })}
            >
              {game.seedInfo.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {(["A", "B"] as const).map((side) => (
              <label key={side}>
                Parent {side}
                <select
                  aria-label={"Parent " + side}
                  required
                  value={
                    (side === "A" ? policy.parentAId : policy.parentBId) ?? ""
                  }
                  onChange={(e) =>
                    update(
                      side === "A"
                        ? { parentAId: e.target.value }
                        : { parentBId: e.target.value },
                    )
                  }
                >
                  <option value="">Choose an owned mature plant</option>
                  {parents.data?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.rarity.tier}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Coin reserve
              <input
                type="number"
                min={0}
                max={1000000}
                value={policy.reserveCoins}
                onChange={(e) =>
                  update({ reserveCoins: Number(e.target.value) })
                }
              />
            </label>
            <p className="panel-note">
              Each cross costs {game.breedCost} coins. Both parents are kept.
              Breeders never auto-sell offspring.
            </p>
          </>
        )}
        {policy.mode === "target_trait" && (
          <>
            <label>
              Desired pigment
              <select
                aria-label="Desired pigment"
                value={policy.targetPigment ?? ""}
                onChange={(e) => {
                  const next = { ...policy };
                  if (e.target.value) next.targetPigment = e.target.value;
                  else delete next.targetPigment;
                  setPolicy(next);
                }}
              >
                <option value="">Any pigment</option>
                {["green", "purple", "red", "yellow"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Desired pattern
              <select
                aria-label="Desired pattern"
                value={policy.targetPattern ?? ""}
                onChange={(e) => {
                  const next = { ...policy };
                  if (e.target.value) next.targetPattern = e.target.value;
                  else delete next.targetPattern;
                  setPolicy(next);
                }}
              >
                <option value="">Any pattern</option>
                {["solid", "variegated", "marbled"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <p className="panel-note">
              Matching children are protected. Targets never change inheritance
              or mutation odds.
            </p>
          </>
        )}
        {worker.kind === "gardener" && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={policy.autoSell}
              onChange={(e) => update({ autoSell: e.target.checked })}
            />
            Sell duplicate Common harvests automatically
          </label>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable automation
        </label>
        <button disabled={action.isPending || game.pendingWork}>
          Save assignment
        </button>
      </form>
      <ActionFeedback action={action} />
    </article>
  );
}
export function Workers() {
  const game = useGame(),
    action = useGameAction();
  return (
    <>
      <GameHeading
        title="A helping hand"
        note="Your team works while you're away. Real seeds, real costs, every interval accounted for."
      />
      <div className="game-grid">
        {(["gardener", "breeder"] as const).map((kind) => {
          const level = kind === "gardener" ? 5 : 7,
            reason =
              game.player.level < level
                ? "Unlocks at level " + level
                : game.workers.length >= 4
                  ? "Team full"
                  : game.player.coins < game.workerCosts[kind]
                    ? "Not enough coins"
                    : null;
          return (
            <article key={kind} className="game-card">
              <h2>
                {kind === "gardener"
                  ? "Junior gardener"
                  : "Breeding specialist"}
              </h2>
              <p>
                {kind === "gardener"
                  ? "Tends one ready or empty slot every 120 seconds (96 with irrigation). Uses seed inventory; recycles starter seeds."
                  : "Creates one real cross every 300 seconds, subject to your coin reserve and parent eligibility."}
              </p>
              <p className="coin-price">
                ◈ {game.workerCosts[kind]} coins · no wages
              </p>
              <button
                disabled={!!reason || action.isPending || game.pendingWork}
                onClick={() =>
                  action.mutate({ action: "hire", data: { kind } })
                }
              >
                {reason ?? "Hire " + kind}
              </button>
            </article>
          );
        })}
      </div>
      <ActionFeedback action={action} />
      <h2 className="section-title">
        Your greenhouse team · {game.workers.length}/4
      </h2>
      {!game.workers.length && (
        <p className="game-tip">
          No employees yet. Growing, selling and completing quests will fund
          your first gardener.
        </p>
      )}
      <div className="game-grid">
        {game.workers.map((w) => (
          <Assignment key={w.id} worker={w} />
        ))}
      </div>
      <p className="panel-note">
        Automation starts paused. Auto-sale starts off and only sells duplicate
        Common harvests: never favorites, protected plants, first discoveries,
        rare plants or your last specimen of a species. Catch-up processes at
        most 100 intervals and 24 hours per calculation. Unprocessed time stays
        available; blocked intervals are recorded, without retroactive spending
        of newly acquired resources.
      </p>
      <h2 className="section-title">Recent work</h2>
      {game.recentRuns.length ? (
        <ol className="work-log">
          {game.recentRuns.map((run) => (
            <li key={run.id}>
              <time>{new Date(run.summary.to).toLocaleString()}</time> ·{" "}
              {run.summary.harvested} harvested · {run.summary.sold} sold ·{" "}
              {run.summary.breeds} crosses · {run.summary.coinDelta} coins ·{" "}
              {run.summary.blocked} waiting intervals
            </li>
          ))}
        </ol>
      ) : (
        <p>The work journal will fill after your team starts tending.</p>
      )}
    </>
  );
}
export function Settings() {
  const game = useGame(),
    [error, setError] = useState(""),
    [motion, setMotion] = useState(
      localStorage.getItem("botanica-motion") ?? "system",
    );
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    localStorage.setItem("botanica-motion", motion);
  }, [motion]);
  return (
    <>
      <GameHeading
        title="At your own pace"
        note={"Signed in as " + game.player.username}
      />
      <section className="game-card settings-card">
        <h2>Comfort & account</h2>
        <label>
          Animations
          <select
            aria-label="Animations"
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
          >
            <option value="system">Follow device preference</option>
            <option value="reduced">Reduce motion</option>
          </select>
        </label>
        <p>
          Recovery codes were shown once when you joined. Keep them private;
          each code resets your password once and signs out other sessions. Use
          “Recover account” on the sign-in screen.
        </p>
        <button
          onClick={() => {
            void request("/auth/logout", { method: "POST", body: "{}" })
              .then(() => location.assign("/"))
              .catch((e) => setError(e.message));
          }}
        >
          Sign out
        </button>
        {error && <p role="alert">{error}</p>}
        <p className="panel-note">
          Fictional botany, deterministic genetics. No tracking, paid currency
          or login streaks.
        </p>
        <Link className="text-link" to="/studies">
          Renderer study gallery →
        </Link>
      </section>
    </>
  );
}
export function Examples() {
  const [cursor, setCursor] = useState<string | null>(null);
  const result = useQuery({
    queryKey: ["demo", cursor],
    queryFn: () =>
      request<
        import("@botanica/shared").PageDto<import("@botanica/shared").PlantDto>
      >(
        "/demo/plants?limit=100" +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      ),
  });
  return (
    <>
      <GameHeading
        title="The reference herbarium"
        note="Original demonstration records, preserved in their own read-only collection. These are examples, not game inventory."
      />
      {result.error && <p role="alert">{result.error.message}</p>}
      <div className="game-grid">
        {result.data?.items.map((p) => (
          <article key={p.id} className="game-card">
            <PlantPreview
              phenotype={p.phenotype}
              visualSeed={p.visualSeed}
              stage="flowering"
              size={128}
            />
            <h2>{p.name}</h2>
            <p>
              {p.rarity.tier} · {p.phenotype.pigment} ·{" "}
              {p.phenotype.leafPattern}
            </p>
            <Link className="text-link" to={"/examples/" + p.id}>
              Inspect reference →
            </Link>
          </article>
        ))}
      </div>
      <div className="house-tabs">
        {cursor && (
          <button onClick={() => setCursor(null)}>First references</button>
        )}
        {result.data?.nextCursor && (
          <button onClick={() => setCursor(result.data!.nextCursor!)}>
            More references →
          </button>
        )}
      </div>
    </>
  );
}
export function ReferenceDetails() {
  const { id } = useParams(),
    navigate = useNavigate(),
    plant = useQuery({
      queryKey: ["demo-plant", id],
      queryFn: () =>
        request<import("@botanica/shared").PlantDto>("/demo/plants/" + id),
    });
  return (
    <>
      <GameHeading
        title={plant.data?.name ?? "Reference specimen"}
        note="The original laboratory archive · read-only genomes, lineage and artwork."
      />
      <Link className="text-link" to="/examples">
        ← Reference herbarium
      </Link>
      {plant.error && <p role="alert">{plant.error.message}</p>}
      {plant.data && (
        <PlantRecord
          plant={plant.data}
          scope="demo"
          onParent={(parent) => navigate("/examples/" + parent)}
        />
      )}
    </>
  );
}
