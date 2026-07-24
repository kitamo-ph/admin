export default function GlobalLoading() {
  return (
    <main className="admin-page" aria-busy="true" aria-label="Loading content">
      <div className="skeleton mb-3 h-4 w-32 rounded" />
      <div className="skeleton mb-8 h-9 w-72 max-w-full rounded" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="skeleton h-32 rounded-xl"
            key={index}
            aria-hidden="true"
          />
        ))}
      </div>
    </main>
  );
}
