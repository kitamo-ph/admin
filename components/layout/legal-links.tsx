/**
 * R21: KitaMo's Privacy Policy and Terms cover this site (it has no legal
 * pages of its own), so every page links to them, as Marketing's footer does.
 * The design pass: each link is a 44 px tall target (the lead's review of 84963c8).
 */
export const PRIVACY_URL = "https://app.kitamo.online/privacy";
export const TERMS_URL = "https://app.kitamo.online/terms";

const linkClass =
  "inline-flex min-h-11 items-center px-1 underline underline-offset-2";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a className={linkClass} href={PRIVACY_URL}>
        Privacy
      </a>
      {" · "}
      <a className={linkClass} href={TERMS_URL}>
        Terms
      </a>
    </p>
  );
}
