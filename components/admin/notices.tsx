import { StateBanner } from "@/components/ui/primitives";

const NOTICES: Record<
  string,
  { tone: "success" | "danger"; title: string; body: string }
> = {
  closed: {
    tone: "success",
    title: "Access closed",
    body: "KitaMo stopped answering for that access. It shows in the access log.",
  },
  close_failed: {
    tone: "danger",
    title: "The access could not be closed",
    body: "It still ends on its own at 30 minutes. Try Close again.",
  },
  flag_raised: {
    tone: "success",
    title: "Flag raised",
    body: "It is a lead, not proof. Review it on the Flags page.",
  },
  flag_reviewed: {
    tone: "success",
    title: "Review saved",
    body: "The flag's new state and your note are in KitaMo's log.",
  },
};

/** The one-line result of a write, carried in ?notice= after a redirect. */
export function Notice({ value }: { value: string | undefined }) {
  const notice = value === undefined ? undefined : NOTICES[value];
  if (notice === undefined) return null;
  return (
    <StateBanner title={notice.title} tone={notice.tone}>
      {notice.body}
    </StateBanner>
  );
}
