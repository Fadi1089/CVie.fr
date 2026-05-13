import { useEffect } from "react";

type Props = {
  onClick?: () => void;
  onHoverStart?: () => void;
  expanded?: boolean;
  pinned?: boolean;
  showSparkles?: boolean;
};

const STYLE_TAG_ID = "cvie-assistant-gem-keyframes";

function ensureKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_TAG_ID;
  style.textContent = `
@keyframes cvie-gem-flow {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
@keyframes cvie-gem-shimmer {
  to { transform: rotate(360deg); }
}
@keyframes cvie-gem-bloom-breathe {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.8;  transform: scale(1.12); }
}
@keyframes cvie-gem-twinkle {
  0%, 100% { transform: scale(0) rotate(0deg);    opacity: 0; }
  45%, 55% { transform: scale(1) rotate(180deg);  opacity: 1; }
}
.cvie-gem {
  --gem-grad: linear-gradient(155deg,
    #6dd47e 0%,
    #f3d863 28%,
    #f08a4a 55%,
    #e6488a 80%,
    #a259d9 100%);
  position: relative;
  display: inline-flex;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 0;
  padding: 0;
  cursor: pointer;
  isolation: isolate;
  background: var(--gem-grad);
  background-size: 240% 240%;
  background-position: 0% 0%;
  animation: cvie-gem-flow 10s ease-in-out infinite;
  box-shadow:
    0 0 0 0.5px rgba(245, 241, 232, 0.95),
    0 1px 3px -1px rgba(162, 89, 217, 0.35),
    0 1px 2px -1px rgba(230, 72, 138, 0.28);
  transition: box-shadow 340ms cubic-bezier(0.22, 1, 0.36, 1);
}
.cvie-gem::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0) 0deg,
    rgba(255, 255, 255, 0.55) 60deg,
    rgba(255, 255, 255, 0) 150deg,
    rgba(255, 255, 255, 0) 360deg);
  mix-blend-mode: overlay;
  animation: cvie-gem-shimmer 12s linear infinite;
  pointer-events: none;
  z-index: 1;
}
.cvie-gem::after {
  content: "";
  position: absolute;
  inset: -12px;
  border-radius: 14px;
  background: radial-gradient(closest-side,
    rgba(243, 216, 99, 0.65),
    rgba(240, 138, 74, 0.5) 28%,
    rgba(230, 72, 138, 0.38) 56%,
    rgba(162, 89, 217, 0.22) 78%,
    transparent 100%);
  filter: blur(8px);
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: -1;
}
.cvie-gem:hover,
.cvie-gem[data-expanded="true"] {
  box-shadow:
    0 0 0 0.5px rgba(245, 241, 232, 1),
    0 4px 10px -2px rgba(162, 89, 217, 0.55),
    0 2px 6px -1px rgba(230, 72, 138, 0.42);
}
.cvie-gem:hover::after,
.cvie-gem[data-expanded="true"]::after {
  opacity: 1;
  transform: scale(1.6);
  animation: cvie-gem-bloom-breathe 3s ease-in-out infinite;
}
.cvie-gem[data-pinned="true"]:not(:hover) {
  box-shadow:
    0 0 0 0.5px rgba(245, 241, 232, 1),
    0 0 0 2px rgba(162, 89, 217, 0.22),
    0 3px 8px -2px rgba(162, 89, 217, 0.45);
}
.cvie-gem-sparkle {
  position: absolute;
  pointer-events: none;
  background: linear-gradient(140deg, #fff0b8 0%, #f3cf57 45%, #c8932e 100%);
  clip-path: polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
  filter:
    drop-shadow(0 0 1.5px rgba(255, 215, 110, 0.95))
    drop-shadow(0 0 4px rgba(232, 178, 60, 0.55));
  animation: cvie-gem-twinkle 2.6s ease-in-out infinite;
  z-index: 2;
  transform-origin: 50% 50%;
}
.cvie-gem-sparkle--a { width: 18px; height: 18px; top: -9px; right: -9px; animation-delay: 0s; }
.cvie-gem-sparkle--b { width: 12px; height: 12px; bottom: -9px; left: -6px; animation-delay: 1s; }
.cvie-gem-sparkle--c { width: 9px; height: 9px; top: 9px; left: -12px; animation-delay: 1.9s; }
.cvie-gem:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 1px #ffffff,
    0 0 0 3px rgba(162, 89, 217, 0.65),
    0 4px 10px -2px rgba(162, 89, 217, 0.55);
}
@media (prefers-reduced-motion: reduce) {
  .cvie-gem,
  .cvie-gem::before,
  .cvie-gem:hover::after,
  .cvie-gem[data-expanded="true"]::after,
  .cvie-gem-sparkle { animation: none; }
  .cvie-gem-sparkle { opacity: 1; transform: scale(1); }
  .cvie-gem,
  .cvie-gem:hover,
  .cvie-gem[data-expanded="true"] {
    transition: box-shadow 200ms ease;
  }
  .cvie-gem::after { transition: opacity 200ms ease; }
}
`.trim();
  document.head.appendChild(style);
}

export function AssistantHandle({
  onClick,
  onHoverStart,
  expanded,
  pinned,
  showSparkles = true,
}: Props) {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onFocus={onHoverStart}
      className="cvie-gem"
      data-expanded={expanded ? "true" : "false"}
      data-pinned={pinned ? "true" : "false"}
      aria-label={
        expanded
          ? "Assistant CVie — fermer"
          : "Assistant CVie — ouvrir"
      }
      aria-haspopup="dialog"
      aria-expanded={!!expanded}
      aria-controls="cv-assistant-panel"
      title="Assistant CVie"
    >
      {showSparkles ? (
        <>
          <span aria-hidden className="cvie-gem-sparkle cvie-gem-sparkle--a" />
          <span aria-hidden className="cvie-gem-sparkle cvie-gem-sparkle--b" />
          <span aria-hidden className="cvie-gem-sparkle cvie-gem-sparkle--c" />
        </>
      ) : null}
    </button>
  );
}
