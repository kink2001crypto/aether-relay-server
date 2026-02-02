/**
 * 🤖 AI Router - Multi-provider support with Agent capabilities
 *
 * Enhanced with structured actions and task management
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AgentResponse, AnyAction, parseActionsFromResponse } from './actions.js';
import { taskQueue, Task } from './taskQueue.js';

interface AIRequest {
    message: string;
    projectContext?: string;
    model: string;
    apiKey?: string;
    projectPath?: string;  // For task tracking
}

interface AIResponse {
    content: string;
    actions?: AnyAction[];
    taskId?: string;
}

// Conversation history for context
interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

// In-memory conversation store (per project)
const conversationHistory: Map<string, Message[]> = new Map();
const MAX_HISTORY = 20; // Keep last 20 messages for context

// Add message to conversation history
function addToHistory(projectPath: string, role: 'user' | 'assistant', content: string): void {
    const history = conversationHistory.get(projectPath) || [];
    history.push({ role, content, timestamp: Date.now() });

    // Keep only last N messages
    while (history.length > MAX_HISTORY) {
        history.shift();
    }

    conversationHistory.set(projectPath, history);
}

// Get conversation history as formatted string
function getHistoryContext(projectPath: string): string {
    const history = conversationHistory.get(projectPath) || [];
    if (history.length === 0) return '';

    return history.map(m =>
        m.role === 'user' ? `👤 User: ${m.content}` : `🤖 AETHER: ${m.content}`
    ).join('\n\n');
}

// Clear conversation history for a project
export function clearHistory(projectPath: string): void {
    conversationHistory.delete(projectPath);
    console.log(`🧹 Cleared conversation history for: ${projectPath}`);
}

function buildAgentPrompt(projectContext: string, historyContext: string): string {
    return `Tu es AETHER, un agent IA de développement avancé et autonome. Tu as accès COMPLET au projet et peux effectuer des actions directement.

## 🎯 TON RÔLE

Tu es un véritable AGENT, pas juste un assistant. Tu:
- Analyses le code de manière proactive
- Proposes des solutions concrètes avec du code
- Exécutes des tâches complexes en plusieurs étapes
- Apprends du contexte de la conversation

## 🔧 TES CAPACITÉS D'AGENT

### 1. LECTURE & ANALYSE
- Tu VOIS tous les fichiers du projet ci-dessous
- Analyse l'architecture, trouve les bugs, comprends les patterns
- Réponds avec précision en citant les fichiers concernés

### 2. CRÉATION/MODIFICATION DE FICHIERS
Format EXACT pour écrire un fichier:
\`\`\`typescript
// chemin/complet/vers/fichier.ts
// ton code ici
\`\`\`

⚠️ IMPORTANT: Le chemin DOIT être en première ligne avec // devant

### 3. COMMANDES TERMINAL
\`\`\`bash
npm install express
\`\`\`

### 4. SUPPRESSION
Dis: "Supprime le fichier \`chemin/fichier.ts\`"

### 5. GIT
Tu peux suggérer des commandes git dans des blocs bash:
\`\`\`bash
git add . && git commit -m "feat: description"
\`\`\`

## 📋 RÈGLES ESSENTIELLES

1. **Proactif**: N'attends pas qu'on te demande, suggère des améliorations
2. **Précis**: Chemins complets, code fonctionnel
3. **Explicatif**: Explique tes choix techniques
4. **Structuré**: Une action à la fois, bien formatée
5. **Français**: Réponds toujours en français

## 💬 HISTORIQUE RÉCENT
${historyContext || '(Nouvelle conversation)'}

## 📁 FICHIERS DU PROJET
${projectContext || '(Aucun projet sélectionné - demande à l\'utilisateur d\'en choisir un)'}

---
Tu es prêt. Agis comme un développeur senior qui a accès direct au code.`;
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
    const { message, projectContext = '', model, apiKey, projectPath = 'default' } = request;

    // Add user message to history
    addToHistory(projectPath, 'user', message);

    // Get conversation context
    const historyContext = getHistoryContext(projectPath);
    const systemPrompt = buildAgentPrompt(projectContext, historyContext);

    let content: string;

    try {
        switch (model) {
            case 'gemini':
                content = (await callGemini(systemPrompt, message, apiKey)).content;
                break;
            case 'openai':
            case 'gpt4o':
                content = (await callOpenAI(systemPrompt, message, apiKey)).content;
                break;
            case 'claude':
            case 'claude35':
                content = (await callClaude(systemPrompt, message, apiKey)).content;
                break;
            default:
                content = (await callGemini(systemPrompt, message, apiKey)).content;
        }

        // Add assistant response to history
        addToHistory(projectPath, 'assistant', content);

        // Parse actions from response
        const actions = parseActionsFromResponse(content);

        // Create task if there are actions
        let taskId: string | undefined;
        if (actions.length > 0) {
            const agentResponse: AgentResponse = {
                message: content,
                actions,
                requiresFollowUp: false
            };
            const task = taskQueue.createTask(projectPath, message, agentResponse);
            taskId = task.id;
            taskQueue.startTask(task.id);
        }

        console.log(`🤖 AI Response: ${content.length} chars, ${actions.length} actions`);

        return { content, actions, taskId };

    } catch (error: any) {
        console.error(`AI Error (${model}):`, error.message);
        throw error;
    }
}

// Get task status
export function getTaskStatus(taskId: string) {
    return taskQueue.getTaskSummary(taskId);
}

// Get project tasks
export function getProjectTasks(projectPath: string, limit = 10) {
    return taskQueue.getProjectTaskSummaries(projectPath, limit);
}

// Record action result (for feedback loop)
export function recordActionResult(taskId: string, actionId: string, success: boolean, output?: string, error?: string) {
    return taskQueue.recordActionResult(taskId, {
        actionId,
        success,
        output,
        error,
        timestamp: Date.now()
    });
}

// Provider-specific functions (return only content, processing happens in callAI)
async function callGemini(system: string, message: string, apiKey?: string): Promise<{ content: string }> {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API key not configured');

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7,
        }
    });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\n---\n\n👤 USER: ${message}` }] }]
    });

    return { content: result.response.text() };
}

async function callOpenAI(system: string, message: string, apiKey?: string): Promise<{ content: string }> {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key not configured');

    const openai = new OpenAI({ apiKey: key });

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: message }
        ]
    });

    return { content: completion.choices[0].message.content || '' };
}

async function callClaude(system: string, message: string, apiKey?: string): Promise<{ content: string }> {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('Claude API key not configured');

    const anthropic = new Anthropic({ apiKey: key });

    const response = await (anthropic as any).messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system,
        messages: [{ role: 'user', content: message }]
    });

    const textBlock = response.content.find((b: any) => b.type === 'text');
    return { content: textBlock ? textBlock.text : '' };
}
