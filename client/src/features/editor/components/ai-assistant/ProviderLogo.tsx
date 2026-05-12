import type { AiProvider } from "@cvie/shared";

type Props = {
  provider: AiProvider | null | undefined;
  size?: number;
  className?: string;
};

const SIMPLEICONS_BASE = "https://cdn.simpleicons.org";

const PROVIDER_META: Record<
  AiProvider,
  { slug: string; label: string }
> = {
  openai: { slug: "openai", label: "OpenAI" },
  anthropic: { slug: "anthropic", label: "Anthropic" },
  google: { slug: "googlegemini", label: "Google Gemini" },
};

export function ProviderLogo({ provider, size = 16, className }: Props) {
  if (!provider || !PROVIDER_META[provider]) {
    return <FallbackMark size={size} className={className} />;
  }
  const { slug, label } = PROVIDER_META[provider];
  return (
    <img
      src={`${SIMPLEICONS_BASE}/${slug}`}
      alt={label}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      style={{ display: "inline-block" }}
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
