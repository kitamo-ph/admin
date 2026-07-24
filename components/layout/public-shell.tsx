import Link from "next/link";

export function PublicShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f7f5ef] lg:grid-cols-[minmax(22rem,0.85fr)_minmax(30rem,1.15fr)]">
      <section className="relative hidden overflow-hidden bg-[#102f24] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-36 size-[28rem] rounded-full border-[5rem] border-white/[0.025]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[#d3a33f]/10"
        />
        <Link
          className="relative flex items-center gap-3 rounded-lg"
          href="/sign-in"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[#d3a33f] text-lg font-black text-[#102f24]">
            K
          </span>
          <span>
            <span className="block text-lg leading-5 font-bold">KitaMo</span>
            <span className="text-[0.65rem] font-semibold tracking-[0.17em] text-[#b9cec1] uppercase">
              Admin Platform
            </span>
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-bold tracking-[0.14em] text-[#d3a33f] uppercase">
            Internal operations
          </p>
          <p className="mt-5 text-3xl leading-tight font-semibold tracking-[-0.035em]">
            Calm, accountable support for the KitaMo ecosystem.
          </p>
          <p className="mt-4 leading-7 text-[#b9cec1]">
            Review platform health, investigate synchronization, and coordinate
            support without exposing merchant financial records.
          </p>
        </div>
        <p className="relative text-xs text-[#8eaa99]">
          Authorized KitaMo administrators only
        </p>
      </section>

      <section className="relative grid place-items-center p-5 sm:p-10">
        <div className="absolute top-5 left-5 flex items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-lg bg-[#d3a33f] font-black text-[#102f24]">
            K
          </span>
          <span className="font-bold text-[#173f30]">KitaMo Admin</span>
        </div>
        <div className="w-full max-w-[30rem] pt-14 lg:pt-0">
          <p className="text-xs font-bold tracking-[0.14em] text-[#b98621] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[#173f30]">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-[#69736d]">{description}</p>
          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </section>
    </main>
  );
}
