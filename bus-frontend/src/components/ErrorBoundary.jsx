import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Application crash captured by ErrorBoundary", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-page px-6 text-main">
        <section className="w-full max-w-lg rounded-[28px] border border-line bg-white p-8 text-center shadow-[var(--shadow-panel)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted">Application Error</p>
          <h1 className="mt-3 text-3xl font-extrabold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The app recovered from a crash. Refresh the page or return to the dashboard.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="mt-6 rounded-full bg-accent px-5 py-3 text-sm font-bold text-slate-950 shadow-[var(--shadow-accent)]"
          >
            Return home
          </button>
        </section>
      </main>
    );
  }
}

export default ErrorBoundary;
