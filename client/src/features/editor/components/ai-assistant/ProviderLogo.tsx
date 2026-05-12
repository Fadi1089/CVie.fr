import type { AiProvider } from "@cvie/shared";

type Props = {
  provider: AiProvider | null | undefined;
  size?: number;
  className?: string;
};

const PROVIDER_META: Record<
  AiProvider,
  { src: string; label: string }
> = {
  openai: { src: "/logos/openai.png", label: "OpenAI" },
  anthropic: { src: "/logos/anthropic.webp", label: "Anthropic" },
  google: { src: "/logos/gemini.png", label: "Google Gemini" },
};

export function ProviderLogo({ provider, size = 16, className }: Props) {
  if (!provider || !PROVIDER_META[provider]) {
    return <FallbackMark size={size} className={className} />;
  }
  const { src, label } = PROVIDER_META[provider];
  return (
    <img
      src={src}
      alt={label}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{ display: "inline-block", objectFit: "contain" }}
    />
  );
}

function FallbackMark({ size, className }: { size: number; className?: string }) {
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
    </svg>
  );
}
