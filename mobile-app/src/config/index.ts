/**
 * 🌐 AETHER Mobile - Configuration
 * Server connection settings for Fly.io deployment
 */

// Production server on Fly.io
export const SERVER_URL = 'https://aether-server.fly.dev';

// Available AI model providers
export const AI_PROVIDERS = ['ollama', 'gemini', 'claude', 'openai', 'deepseek', 'grok', 'glm'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

// Default model variants for each provider
export const DEFAULT_MODEL_VARIANTS: Record<string, string> = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  grok: 'grok-2-latest',
  glm: 'glm-4-plus',
  ollama: 'qwen2.5:14b',
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
