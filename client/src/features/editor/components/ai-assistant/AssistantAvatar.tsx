type Props = {
  size?: number;
  className?: string;
};

export function AssistantAvatar({ size = 18, className }: Props) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="10"
        cy="10"
        r="9.2"
        fill="var(--color-paper-soft, #fbf7f0)"
        stroke="var(--color-ink)"
        strokeWidth="0.7"
      />
      <path
        d="M10 4.4 L11.35 8.65 L15.6 10 L11.35 11.35 L10 15.6 L8.65 11.35 L4.4 10 L8.65 8.65 Z"
        fill="var(--color-ink)"
      />
      <circle cx="14.6" cy="5.4" r="0.85" fill="var(--color-ink)" />
    </svg>
  );
}
