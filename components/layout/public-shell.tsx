import Link from "next/link";

import { LegalLinks } from "./legal-links";
import { ReadOnlyLine } from "./read-only-line";

export function PublicShell({
  eyebrow,
  title,
  description,
  children,
  readOnlyLine = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** The lead's decision on 84963c8: a plain state a signed-in admin reaches carries the read-only line. */
  readOnlyLine?: boolean;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[var(--km-color-page)] lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
      <section className="relative hidden overflow-hidden bg-[var(--km-color-select)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-36 size-[28rem] rounded-full border-[5rem] border-white/[0.025]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[var(--km-color-accent)]/10"
        />
        <Link
          className="relative flex items-center gap-3 rounded-lg"
          href="/sign-in"
          prefetch={false}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- KitaMo's static mark */}
          <img
            alt=""
            className="size-10 rounded-xl bg-white p-1"
            height={40}
            src="/kitamo-mark.png"
            width={40}
          />
          <span>
            <span className="block text-lg leading-5 font-bold">KitaMo</span>
            <span className="text-[0.65rem] font-semibold tracking-[0.17em] text-[#b9cec1] uppercase">
              Admin Platform
            </span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-bold tracking-[0.14em] text-[var(--km-color-accent)] uppercase">
            Internal operations
          </p>
          <p className="mt-5 text-3xl leading-tight font-semibold tracking-[-0.035em]">
            Every look at a business has a reason, a time limit, and a record.
          </p>
          <p className="mt-4 leading-7 text-[#b9cec1]">
            Counts first. Records only behind a flag or a reference, for 30
            minutes, read-only, and shown to the business.
          </p>
        </div>
        <p className="relative text-xs text-[#8eaa99]">
          KitaMo&apos;s admin account only
        </p>
      </section>

      {/* The design pass (Adm Site canvas, plain states): one centred 420 px column, the mark and name first
          (below the laptop width; the panel shows them above it), a secondary eyebrow, a 30 px title, the
          state's own words, then its capsule action and Privacy · Terms as 44 px links. */}
      <section className="relative grid place-items-center px-5 py-14 sm:p-10">
        <div className="w-full max-w-[26.25rem]">
          <p className="mb-10 flex items-center gap-2.5 text-[1.0625rem] font-bold text-[var(--km-color-text)] lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- KitaMo's static mark */}
            <img
              alt=""
              className="rounded-lg"
              height={32}
              src="/kitamo-mark.png"
              width={32}
            />
            KitaMo Admin
          </p>
          {readOnlyLine ? <ReadOnlyLine className="mb-6" /> : null}
          <p className="text-xs font-bold tracking-[0.08em] text-[var(--km-color-text-secondary)] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-[1.875rem] leading-[1.15] font-bold tracking-[-0.02em] text-balance text-[var(--km-color-text)]">
            {title}
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-[1.45] text-pretty text-[var(--km-color-text-secondary)]">
            {description}
          </p>
          {children ? <div className="mt-6">{children}</div> : null}
          <LegalLinks className="mt-8 -ml-1 text-[0.9375rem] text-[var(--km-color-text-secondary)]" />
        </div>
      </section>
    </main>
  );
}
