import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches throws from `CvEditor` and its subtree so a single bad field
 * or renderer call can't white-screen the route. The draft lives in
 * `localStorage["cvie.cv.draft"]`, so reloading recovers user work.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[EditorErrorBoundary]", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="mx-auto mt-10 max-w-md rounded-lg border border-red-500/30 bg-white p-6 text-center shadow-sm"
      >
        <h2 className="text-[16px] font-medium text-[var(--color-ink)]">
          Une erreur est survenue
        </h2>
        <p className="mt-2 text-[13px] text-[var(--color-ink-soft)]">
          Votre brouillon est sauvegardé localement. Rechargez l'éditeur
          pour continuer.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--color-ink)]/20 bg-[var(--color-ink)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--color-ink)]/90 focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]/40 motion-reduce:transition-none"
        >
          Recharger l'éditeur
        </button>
      </div>
    );
  }
}
