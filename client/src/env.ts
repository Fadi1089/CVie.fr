type ClientEnv = {
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_AUDIENCE: string;
  SERVER_URL: string;
};

function read(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required env var: ${String(key)}`);
  }
  return value;
}

export const clientEnv: ClientEnv = {
  AUTH0_DOMAIN: read("VITE_AUTH0_DOMAIN"),
  AUTH0_CLIENT_ID: read("VITE_AUTH0_CLIENT_ID"),
  AUTH0_AUDIENCE: read("VITE_AUTH0_AUDIENCE"),
  SERVER_URL: read("VITE_SERVER_URL"),
};
