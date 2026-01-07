/**
 * 🤖 AI Router - Multi-provider support
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

export async function callAI(request: AIRequest): Promise<AIResponse> {
    const { message, projectContext = '', model, apiKey } = request;

    const systemPrompt = `Tu es AETHER, un assistant IA expert en développement.
${projectContext}

Quand tu génères du code, mets TOUJOURS le chemin du fichier en première ligne:
- Pour JS/TS: // src/path/file.ts
- Pour Python: # src/path/file.py

Réponds en français. Sois concis et utile.`;

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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\nUser: ${message}` }] }]
    });

    return { content: result.response.text() };
}

async function callOpenAI(system: string, message: string, apiKey?: string): Promise<AIResponse> {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OpenAI API key not configured');

    const openai = new OpenAI({ apiKey: key });

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
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
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: message }]
    });

    const textBlock = response.content.find((b: any) => b.type === 'text');
    return { content: textBlock ? textBlock.text : '' };
}
