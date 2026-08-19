export type ClerkAuthConfig = {
  enabled: boolean;
  publishableKey: string;
  issuerUrl: string;
  samlConnectionId: string;
};

let cachedClerkConfig: ClerkAuthConfig = {
  enabled: process.env.CLERK_ENABLED === "true",
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_enterprise_deere_federation",
  issuerUrl: process.env.CLERK_ISSUER_URL || "https://clerk.deere.enterprise.auth",
  samlConnectionId: process.env.CLERK_SAML_CONNECTION_ID || "saml_deere_azure_ad"
};

export function getClerkAuthConfig(): ClerkAuthConfig {
  return cachedClerkConfig;
}

export function updateClerkAuthConfig(patch: Partial<ClerkAuthConfig>): ClerkAuthConfig {
  cachedClerkConfig = { ...cachedClerkConfig, ...patch };
  return cachedClerkConfig;
}
