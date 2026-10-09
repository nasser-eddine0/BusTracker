import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6 text-main">
      <section className="w-full max-w-lg rounded-[28px] border border-line bg-white p-8 text-center shadow-[var(--shadow-panel)]">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted">404</p>
        <h1 className="mt-3 text-4xl font-extrabold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The page you requested does not exist or is no longer available.
        </p>
        <Link
          to="/choose-role"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 text-sm font-bold text-slate-950 shadow-[var(--shadow-accent)]"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}

export default NotFound;
