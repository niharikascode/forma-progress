"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="loading-page">
      <h1>Something interrupted your workspace.</h1>
      <p>Your saved work is still in the database.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
