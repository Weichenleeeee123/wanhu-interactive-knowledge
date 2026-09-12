export interface AiChatConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export function getAiChatConfig(
  env: Record<string, string | undefined>,
): AiChatConfig | null {
  const { AI_BASE_URL: baseUrl, AI_MODEL: model, AI_API_KEY: apiKey } = env;
  if (!baseUrl || !model || !apiKey) return null;
  try {
    const endpoint = new URL(
      "chat/completions",
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    );
    if (!["https:", "http:"].includes(endpoint.protocol)) return null;
    return { endpoint: endpoint.toString(), apiKey, model };
  } catch {
    return null;
  }
}
