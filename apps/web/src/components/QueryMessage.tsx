export function QueryMessage({
  error,
  retry,
  loading = false,
}: {
  error?: Error | null;
  retry?: () => void;
  loading?: boolean;
}) {
  return (
    <div
      className={"query-message" + (error ? " error-message" : "")}
      role={error ? "alert" : "status"}
    >
      <p>
        {loading
          ? "Growing your view…"
          : (error?.message ?? "Nothing here yet.")}
      </p>
      {error && retry && (
        <button className="secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
