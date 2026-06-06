// Provider Client Types — Phase 3 Foundation

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  providerId: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
  tools?: ToolDefinition[];
}

export interface ChatCompletionChunk {
  delta: string;
  finishReason?: 'stop' | 'length' | 'error' | null;
  index?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  toolCalls?: ToolCallRequest[];
  raw?: unknown;
}

export interface ProviderClient {
  readonly providerId: string;
  readonly providerType: string;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResult>;
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

export type ProviderClientConstructor = new (providerId: string, config: ProviderConfig) => ProviderClient;

export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  extraHeaders?: Record<string, string>;
}
