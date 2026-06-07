import { GroqProvider, ChatMessage } from './llm';
import { withRetry } from './resilience';

export interface LLMJsonOptions {
  systemPrompt?: string;
  fallback: any;
  temperature?: number;
  maxRetries?: number;
}

export async function generateStructuredJson(
  provider: GroqProvider,
  userPrompt: string,
  options: LLMJsonOptions
): Promise<any> {
  const sysPrompt = options.systemPrompt || 'You output only valid JSON. No prose, no markdown fences, no commentary. Respond with a single JSON object.';
  try {
    const result = await withRetry(async () => {
      const messages: ChatMessage[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
      return await provider.generate(messages, sysPrompt, []);
    }, {
      retries: options.maxRetries ?? 2,
      minTimeoutMs: 500,
      factor: 2
    });
    const text = result.content || '';
    const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
    const jsonText = fence ? fence[1] : text;
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    const slice = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? jsonText.substring(firstBrace, lastBrace + 1)
      : jsonText;
    const parsed = JSON.parse(slice.trim());
    return parsed;
  } catch (e: any) {
    console.warn(`[generateStructuredJson] LLM call failed, returning fallback. Reason: ${e.message}`);
    return options.fallback;
  }
}

export async function generateText(
  provider: GroqProvider,
  userPrompt: string,
  options: { systemPrompt?: string; fallback: string; maxRetries?: number } = { fallback: '' }
): Promise<string> {
  try {
    const result = await withRetry(async () => {
      const messages: ChatMessage[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
      return await provider.generate(messages, options.systemPrompt, []);
    }, {
      retries: options.maxRetries ?? 2,
      minTimeoutMs: 500,
      factor: 2
    });
    return (result.content || '').trim() || options.fallback;
  } catch (e: any) {
    console.warn(`[generateText] LLM call failed, returning fallback. Reason: ${e.message}`);
    return options.fallback;
  }
}
