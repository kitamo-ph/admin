/**
 * R21: KitaMo's Privacy Policy and Terms cover this site (it has no legal
 * pages of its own), so every page links to them, as Marketing's footer does.
 */
export const PRIVACY_URL = "https://app.kitamo.online/privacy";
export const TERMS_URL = "https://app.kitamo.online/terms";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a className="underline underline-offset-2" href={PRIVACY_URL}>
        Privacy
      </a>
      {" · "}
      <a className="underline underline-offset-2" href={TERMS_URL}>
        Terms
      </a>
    </p>
  );
}
