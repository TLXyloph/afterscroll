export type ScoutMood = "ready" | "listening" | "thinking" | "bright";

export default function ScoutFace({ mood }: { mood: ScoutMood }) {
  const label =
    mood === "listening"
      ? "Scout is listening"
      : mood === "thinking"
        ? "Scout is thinking"
        : mood === "bright"
          ? "Scout is happy"
          : "Scout is ready";

  return (
    <span className={`scout-avatar scout-avatar--${mood}`} aria-label={label}>
      <span className="scout-avatar__antenna" />
      <span className="scout-avatar__eye scout-avatar__eye--left" />
      <span className="scout-avatar__eye scout-avatar__eye--right" />
      <span className="scout-avatar__mouth" />
    </span>
  );
}