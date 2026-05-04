import type { ReactNode } from "react";
import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router";
import { clientEnv } from "@/env";

type Props = { children: ReactNode };

export function Auth0ProviderWithNavigate({ children }: Props) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? "/editor", { replace: true });
  };

  return (
    <Auth0Provider
      domain={clientEnv.AUTH0_DOMAIN}
      clientId={clientEnv.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/auth/callback`,
        audience: clientEnv.AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      useRefreshTokensFallback
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
