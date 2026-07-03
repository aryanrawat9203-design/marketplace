import { ReactNode } from "react";

const tones: Record<string, string> = {
  violet: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
  emerald: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  sky: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  rose: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  zinc: "bg-zinc-500/10 text-zinc-300 ring-zinc-500/30",
};

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        tones[tone] ?? tones.zinc
      }`}
    >
      {children}
    </span>
  );
}

export function difficultyTone(d?: string | null) {
  switch (d) {
    case "Beginner":
      return "emerald";
    case "Intermediate":
      return "sky";
    case "Advanced":
      return "amber";
    case "Expert":
      return "rose";
    default:
      return "zinc";
  }
}

export function tierTone(t?: string | null) {
  switch (t) {
    case "Free":
      return "zinc";
    case "Starter":
      return "emerald";
    case "Professional":
      return "sky";
    case "Premium":
      return "violet";
    case "Enterprise":
      return "amber";
    default:
      return "zinc";
  }
}
