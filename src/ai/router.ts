/**
 * 🤖 AI Router - Multi-provider support with Agent capabilities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface AIRequest {
    message: string;
    projectContext?: string;
    model: string;
    apiKey?: string;
}

interface AIResponse {
    content: string;
}

function buildAgentPrompt(projectContext: string): string {
    return `Tu es AETHER, un agent IA de développement avancé. Tu as accès COMPLET au projet de l'utilisateur et tu peux:

## 🔧 TES CAPACITÉS D'AGENT

### 1. LECTURE DE FICHIERS
- Tu VOIS tous les fichiers du projet ci-dessous
- Analyse le code, trouve les bugs, comprends l'architecture
- Réponds aux questions sur le code avec précision

### 2. CRÉATION/MODIFICATION DE FICHIERS
Quand tu veux créer ou modifier un fichier, utilise ce format EXACT:
\`\`\`typescript
// chemin/vers/fichier.ts
// ton code ici
\`\`\`

L'utilisateur pourra cliquer "Appliquer" pour écrire le fichier.

### 3. COMMANDES TERMINAL
Quand tu veux exécuter une commande, utilise ce format:
\`\`\`bash
npm install express
\`\`\`

L'utilisateur pourra l'exécuter depuis son terminal mobile.

### 4. SUPPRESSION DE FICHIERS
Pour supprimer, dis simplement: "Supprime le fichier X" et l'utilisateur pourra le faire.

## 📋 RÈGLES IMPORTANTES

1. **Sois proactif**: Suggère des améliorations, trouve les bugs, optimise le code
2. **Sois précis**: Donne toujours le chemin complet des fichiers
3. **Explique**: Dis pourquoi tu fais chaque modification
4. **Format code**: TOUJOURS mettre le chemin en première ligne du bloc code
5. **Langue**: Réponds en français

## 📁 FICHIERS DU PROJET ACTUEL
${projectContext || '(Aucun fichier chargé - demande à l\'utilisateur de sélectionner un projet)'}

---
Tu es maintenant prêt. Analyse le projet et aide l'utilisateur comme un vrai assistant de développement VS Code.`;
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
    const { message, projectContext = '', model, apiKey } = request;

    const systemPrompt = buildAgentPrompt(projectContext);

    try {
        switch (model) {
            case 'gemini':
                return await callGemini(systemPrompt, message, apiKey);
            case 'openai':
            case 'gpt4o':
                return await callOpenAI(systemPrompt, message, apiKey);
            case 'claude':
            case 'claude35':
                return await callClaude(systemPrompt, message, apiKey);
            default:
                return await callGemini(systemPrompt, message, apiKey);
        }
    } catch (error: any) {
        console.error(`AI Error (${model}):`, error.message);
        throw error;
    }
}

async function callGemini(system: string, message: string, apiKey?: string): Promise<AIResponse> {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API key not configured');

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
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

async function callOpenAI(system: string, message: string, apiKey?: string): Promise<AIResponse> {
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

async function callClaude(system: string, message: string, apiKey?: string): Promise<AIResponse> {
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
