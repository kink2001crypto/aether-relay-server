/**
 * 🌐 AETHER Mobile - Configuration
 * Server connection settings for Fly.io deployment
 */

// Production server on Railway
export const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

// Available AI model providers (including OpenRouter for unified access)
export const AI_PROVIDERS = ['openrouter', 'gemini', 'claude', 'openai', 'deepseek', 'grok', 'mistral', 'ollama'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

// Default model variants for each provider - Updated February 2026
export const DEFAULT_MODEL_VARIANTS: Record<string, string> = {
  openrouter: 'anthropic/claude-sonnet-4.5',     // OpenRouter unified - Claude Sonnet 4.5 (best for coding)
  gemini: 'google/gemini-3-flash',               // Gemini 3 Flash - fast, 1M context
  claude: 'anthropic/claude-opus-4.6',           // Claude Opus 4.6 - latest premium
  openai: 'openai/gpt-5.3-codex',                // GPT-5.3 Codex - self-improving
  deepseek: 'deepseek/deepseek-v3.2',            // DeepSeek V3.2 - cost effective
  grok: 'x-ai/grok-3',                           // Grok 3 - latest from X
  mistral: 'mistralai/devstral-2',               // Devstral 2 - agentic coding
  ollama: 'qwen2.5:14b',                         // Local model
};

// App version info
export const APP_VERSION = '2.0.0';
export const BUILD_DATE = '2026.02.02';

// WebSocket configuration
export const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'] as string[],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 30000,
  forceNew: false,
};

// Storage keys
export const STORAGE_KEYS = {
  selectedModel: 'selectedModel',
  apiKeys: 'apiKeys',
  modelVariants: 'modelVariants',
  currentProject: 'currentProject',
  themeMode: '@aether/theme_mode',
};
