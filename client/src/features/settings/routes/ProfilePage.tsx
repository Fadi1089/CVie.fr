import { useAuth0 } from "@auth0/auth0-react";

export function ProfilePage() {
  const { user, logout } = useAuth0();
  if (!user) return null;

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <section>
      <header className="mb-8">
        <p className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
          Identité
        </p>
        <h2 className="mt-2 font-display text-[28px] leading-[1] tracking-[-0.02em]">
          Profil
        </h2>
        <p className="mt-3 max-w-[44ch] text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          Géré par votre fournisseur d'identité Auth0. Modifiez ces
          informations depuis votre compte Google ou GitHub.
        </p>
      </header>

      <div className="flex items-center gap-5 border-t border-[var(--color-rule)] py-6">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-paper-deep)] text-[14px] font-semibold">
            {initials}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {user.name ? (
            <p className="truncate font-display text-[20px] leading-[1.1] tracking-[-0.01em]">
              {user.name}
            </p>
          ) : null}
          <p className="truncate text-[13px] text-[var(--color-ink-soft)]">
            {user.email}
          </p>
        </div>
      </div>

      <dl className="grid gap-x-12 gap-y-5 border-t border-[var(--color-rule)] py-6 sm:grid-cols-2">
        <Field label="Email" value={user.email ?? "—"} />
        <Field label="Identifiant Auth0" value={user.sub ?? "—"} mono />
        {user.email_verified !== undefined ? (
          <Field
            label="Email vérifié"
            value={user.email_verified ? "Oui" : "Non"}
          />
        ) : null}
        {user.updated_at ? (
          <Field
            label="Dernière mise à jour"
            value={new Date(user.updated_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
        ) : null}
      </dl>

      <div className="border-t border-[var(--color-rule)] pt-6">
        <button
          type="button"
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
        >
          Déconnexion →
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono-caps text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)]">
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-[13px] text-[var(--color-ink)] ${mono ? "font-mono text-[12px]" : ""}`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
