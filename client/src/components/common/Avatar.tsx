// Developed by Sydney Edwards
type AvatarSize = "sm" | "md" | "lg";

const sizeClass: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base"
};

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((n) => n.trim()[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({
  name,
  color,
  size = "md"
}: {
  name: string;
  color: string;
  size?: AvatarSize;
}) {
  return (
    <div
      className={[
        "inline-grid place-items-center border border-[var(--color-border)] font-semibold text-[var(--color-text-primary)]",
        sizeClass[size]
      ].join(" ")}
      style={{ background: color }}
      aria-label={name}
      title={name}
    >
      {initialsFromName(name)}
    </div>
  );
}

