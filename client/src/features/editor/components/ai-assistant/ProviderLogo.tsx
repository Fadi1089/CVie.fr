import type { AiProvider } from "@cvie/shared";

type Props = {
  provider: AiProvider | null | undefined;
  size?: number;
  className?: string;
};

export function ProviderLogo({ provider, size = 16, className }: Props) {
  if (provider === "openai") return <OpenAIMark size={size} className={className} />;
  if (provider === "anthropic") return <AnthropicMark size={size} className={className} />;
  if (provider === "google") return <GoogleGeminiMark size={size} className={className} />;
  return <FallbackMark size={size} className={className} />;
}

function OpenAIMark({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="OpenAI"
      role="img"
      className={className}
    >
      <g
        fill="none"
        stroke="#000"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="7.5" />
        <ellipse cx="12" cy="12" rx="7.5" ry="3" />
        <ellipse
          cx="12"
          cy="12"
          rx="7.5"
          ry="3"
          transform="rotate(60 12 12)"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="7.5"
          ry="3"
          transform="rotate(120 12 12)"
        />
      </g>
    </svg>
  );
}

function AnthropicMark({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Anthropic"
      role="img"
      className={className}
    >
      <g
        stroke="#cc785c"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
        <line x1="5.6" y1="18.4" x2="18.4" y2="5.6" />
      </g>
    </svg>
  );
}

function GoogleGeminiMark({ size, className }: { size: number; className?: string }) {
  const gradId = `gemini-grad-${size}`;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-label="Google Gemini"
      role="img"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c7ed6" />
          <stop offset="50%" stopColor="#9b72cb" />
          <stop offset="100%" stopColor="#d96570" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M12 2 C12.4 7 13.6 9.6 16 11 C13.6 12.4 12.4 15 12 22 C11.6 15 10.4 12.4 8 11 C10.4 9.6 11.6 7 12 2 Z"
      />
    </svg>
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
