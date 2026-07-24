import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[#dfe4df] bg-[#fffefa] p-8 shadow-[var(--shadow-card)]">
        <div className="mb-5 grid size-12 place-items-center rounded-xl bg-[#f5e9c9] font-bold text-[#8a6115]">
          404
        </div>
        <p className="text-xs font-bold tracking-[0.12em] text-[#69736d] uppercase">
          Page not found
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#173f30]">
          That admin view does not exist
        </h1>
        <p className="mt-3 text-[#69736d]">
          Check the address or return to the operational overview.
        </p>
        <Link
          className="mt-6 inline-flex rounded-lg bg-[#173f30] px-4 py-2.5 font-semibold text-white hover:bg-[#1e513d]"
          href="/overview"
        >
          Go to overview
        </Link>
      </section>
    </main>
  );
}
