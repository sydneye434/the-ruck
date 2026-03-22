// Developed by Sydney Edwards
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[The Ruck] UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "var(--font-body, system-ui, sans-serif)",
            background: "var(--color-bg-tertiary)",
            color: "var(--color-text-primary)"
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
            The app hit a runtime error. Open the browser developer console (F12) for details.
          </p>
          <pre
            style={{
              padding: "1rem",
              background: "var(--color-bg-primary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-secondary)",
              overflow: "auto",
              fontSize: "0.85rem"
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              background: "var(--color-accent)",
              color: "var(--color-bg-secondary)",
              border: "1px solid var(--color-accent-hover)",
              borderRadius: "2px"
            }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
