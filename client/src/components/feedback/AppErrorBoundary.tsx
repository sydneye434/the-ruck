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
            fontFamily: "system-ui, sans-serif",
            background: "#101010",
            color: "#ffeaf6"
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ opacity: 0.85, marginBottom: "1rem" }}>
            The app hit a runtime error. Open the browser developer console (F12) for details.
          </p>
          <pre
            style={{
              padding: "1rem",
              background: "#050505",
              border: "1px solid #2a2a2a",
              overflow: "auto",
              fontSize: "0.85rem"
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
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
