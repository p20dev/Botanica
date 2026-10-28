import React from "react";
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <div className="query-message" role="alert">
          <h1>The laboratory needs a moment.</h1>
          <p>
            Reload the view to try again. Saved plants are kept in the database.
          </p>
          <button onClick={() => window.location.reload()}>
            Reload laboratory
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
