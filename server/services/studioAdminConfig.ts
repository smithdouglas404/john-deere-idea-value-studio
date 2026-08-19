import { getClerkAuthConfig, updateClerkAuthConfig, type ClerkAuthConfig } from "./clerkAuthProvider";
import { searchSharepointDocuments, syncHackathonBacklogToJira, type SharepointDocumentResult, type JiraSyncResult } from "./enterpriseMcpAdapters";

export type TenantConfig = {
  llmProvider: "anthropic" | "openai" | "built_in";
  apiKeyMasked: string;
  defaultModel: string;
  lightModel: string;
  heavyModel: string;
  brandTheme: "john_deere" | "kyndryl" | "enterprise_green" | "classic_oat";
  primaryColor: string;
  accentColor: string;
  defaultLocale: "en" | "es" | "de" | "fr" | "pt";
  supportedLocales: string[];
  clerkAuth: ClerkAuthConfig;
  mcpStatus: {
    sharepointConnected: boolean;
    jiraConnected: boolean;
  };
};

let currentConfig: TenantConfig = {
  llmProvider: "anthropic",
  apiKeyMasked: "sk-ant-...**** (Configured)",
  defaultModel: "claude-sonnet-4-6",
  lightModel: "claude-haiku-4-5",
  heavyModel: "claude-sonnet-4-6",
  brandTheme: "john_deere",
  primaryColor: "#173d2a",
  accentColor: "#876e16",
  defaultLocale: "en",
  supportedLocales: ["en", "es", "de", "fr", "pt"],
  clerkAuth: getClerkAuthConfig(),
  mcpStatus: {
    sharepointConnected: true,
    jiraConnected: true
  }
};

export function getTenantConfig(): TenantConfig {
  return {
    ...currentConfig,
    clerkAuth: getClerkAuthConfig()
  };
}

export function updateTenantConfig(patch: Partial<TenantConfig> & { clerkAuth?: Partial<ClerkAuthConfig> }): TenantConfig {
  if (patch.clerkAuth) {
    updateClerkAuthConfig(patch.clerkAuth);
  }
  currentConfig = {
    ...currentConfig,
    ...patch,
    clerkAuth: getClerkAuthConfig()
  };
  return getTenantConfig();
}

export async function invokeSharepointSearch(query: string) {
  return searchSharepointDocuments(query);
}

export async function invokeJiraSync(proofTitle: string, backlogItems: string[]) {
  return syncHackathonBacklogToJira(proofTitle, backlogItems);
}
