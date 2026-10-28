import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameAction, GameState, OfflineSummary } from "@botanica/shared";
import { request, RequestError, setCsrf } from "./api";
import { newRequestId } from "./requestId";
const Context = createContext<GameState | null>(null);
export function useGame() {
  const game = useContext(Context);
  if (!game) throw new Error("Game state unavailable");
  return game;
}
export function useGameAction() {
  const client = useQueryClient(),
    keys = useRef(new Map<string, string>());
  return useMutation({
    mutationFn: async (input: {
      action: GameAction["action"];
      data: Record<string, unknown>;
    }) => {
      const fingerprint = JSON.stringify(input),
        id = keys.current.get(fingerprint) ?? newRequestId();
      keys.current.set(fingerprint, id);
      const result = await request<{
        message: string;
        plantId?: string;
        discovered?: boolean;
      }>("/game/action", {
        method: "POST",
        body: JSON.stringify({ ...input, requestId: id }),
      });
      keys.current.delete(fingerprint);
      return result;
    },
    onSuccess: () => client.invalidateQueries(),
    onError: () => {
      void client.invalidateQueries({ queryKey: ["game"] });
    },
  });
}
export function ActionFeedback({
  action,
}: {
  action: ReturnType<typeof useGameAction>;
}) {
  return (
    <>
      {action.error && (
        <p role="alert" className="error-text">
          {action.error.message}
        </p>
      )}
      {action.data && (
        <p role="status" className="saved-notice">
          {action.data.message}
        </p>
      )}
    </>
  );
}
function Auth() {
  const [mode, setMode] = useState("login"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [codes, setCodes] = useState<string[] | null>(null),
    client = useQueryClient();
  const auth = useMutation({
    mutationFn: () =>
      request<{ csrfToken: string; recoveryCodes?: string[] }>(
        "/auth/" + mode,
        {
          method: "POST",
          body: JSON.stringify({
            username,
            password,
            ...(mode === "recover" ? { recoveryCode: code } : {}),
          }),
        },
      ),
    onSuccess: (result) => {
      setCsrf(result.csrfToken);
      setPassword("");
      if (result.recoveryCodes) setCodes(result.recoveryCodes);
      else location.assign("/");
    },
  });
  return (
    <main className="auth-scene">
      <div className="auth-botanical" aria-hidden="true">
        ❦
      </div>
      <section className="auth-panel">
        <p className="eyebrow">A little greenhouse. Endless possibility.</p>
        <h1>Botanica</h1>
        {codes ? (
          <>
            <h2>Keep your recovery codes</h2>
            <p>
              Save these five one-use codes somewhere private. They are shown
              only once. Use one to reset a forgotten password; no email is
              required.
            </p>
            <div className="recovery-codes">
              {codes.map((c) => (
                <code key={c}>{c}</code>
              ))}
            </div>
            <button
              onClick={() => {
                setCodes(null);
                location.assign("/");
              }}
            >
              I've saved my codes — enter greenhouse
            </button>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              {[
                ["login", "Sign in"],
                ["register", "Create account"],
                ["recover", "Recover account"],
              ].map(([id, label]) => (
                <button
                  type="button"
                  className={mode === id ? "" : "secondary"}
                  key={id}
                  onClick={() => {
                    setMode(id);
                    auth.reset();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                auth.mutate();
              }}
            >
              <label>
                Username
                <input
                  autoComplete="username"
                  required
                  pattern="[a-zA-Z0-9_]{3,24}"
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                {mode === "recover" ? "New password" : "Password"}
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === "recover" && (
                <label>
                  One-use recovery code
                  <input
                    required
                    pattern="[a-f0-9]{24}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                  />
                </label>
              )}
              <small>
                Username: 3–24 letters, numbers or underscores. Password: at
                least 10 characters.
              </small>
              <button disabled={auth.isPending}>
                {auth.isPending
                  ? "Opening the gate…"
                  : mode === "login"
                    ? "Enter greenhouse"
                    : mode === "register"
                      ? "Start growing"
                      : "Reset password"}
              </button>
              {auth.error && (
                <p role="alert" className="error-text">
                  {auth.error.message}
                </p>
              )}
            </form>
            <p className="panel-note">
              Start with 120 coins, three seeds and your own glasshouse. No
              email, no daily streaks. Grow at your own pace.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
function Report({
  report,
  onDismiss,
}: {
  report: OfflineSummary;
  onDismiss: () => void;
}) {
  return (
    <section className="offline-report" aria-label="Offline progress">
      <div>
        <p className="eyebrow">While you were away</p>
        <h2>Your greenhouse kept growing.</h2>
        <p>
          {report.harvested} harvested · {report.sold} sold · {report.breeds}{" "}
          crosses · {report.seedsUsed} seeds used ·{" "}
          {report.coinDelta >= 0 ? "+" : ""}
          {report.coinDelta} coins
        </p>
        <p className="panel-note">
          {new Date(report.from).toLocaleString()} →{" "}
          {new Date(report.to).toLocaleString()} · {report.events} worker
          intervals · {report.blocked} intervals waiting for resources or a
          ready crop.
        </p>
        {!!report.notable.length && (
          <p>
            {report.notable.length} notable discoveries are waiting in your
            collection.
          </p>
        )}
      </div>
      <button
        className="secondary"
        onClick={onDismiss}
        aria-label="Dismiss offline report"
      >
        Dismiss
      </button>
    </section>
  );
}
export function GameProvider({ children }: { children: ReactNode }) {
  const me = useQuery({
      queryKey: ["me"],
      queryFn: async () => {
        const value = await request<{ csrfToken: string }>("/me");
        setCsrf(value.csrfToken);
        return value;
      },
      retry: false,
    }),
    client = useQueryClient(),
    [report, setReport] = useState<OfflineSummary | null>(null);
  const game = useQuery({
    queryKey: ["game"],
    queryFn: async () => {
      const state = await request<GameState>("/game/state");
      setCsrf(state.player.csrfToken);
      return state;
    },
    enabled: me.isSuccess,
    refetchInterval: 15000,
    retry: false,
  });
  useEffect(() => {
    if (game.data?.report) setReport(game.data.report);
  }, [game.data]);
  useEffect(() => {
    if (game.error instanceof RequestError && game.error.status === 401)
      void client.invalidateQueries({ queryKey: ["me"] });
  }, [game.error, client]);
  if (me.isPending)
    return (
      <main className="empty">
        <h1>Opening the greenhouse…</h1>
      </main>
    );
  if (me.error) {
    if (me.error instanceof RequestError && me.error.status === 401)
      return <Auth />;
    return (
      <main className="empty">
        <p role="alert">{me.error.message}</p>
        <button onClick={() => void me.refetch()}>Reconnect</button>
      </main>
    );
  }
  if (!game.data)
    return (
      <main className="empty">
        <h2>
          {game.error
            ? "The greenhouse is unavailable."
            : "Preparing your growing bench…"}
        </h2>
        {game.error && <p role="alert">{game.error.message}</p>}
        <button onClick={() => void game.refetch()}>Reconnect</button>
      </main>
    );
  return (
    <Context.Provider value={game.data}>
      {children}
      {report && (
        <div className="report-dock">
          <Report report={report} onDismiss={() => setReport(null)} />
        </div>
      )}
    </Context.Provider>
  );
}
