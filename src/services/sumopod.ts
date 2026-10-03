import 'dotenv/config';
import { OpenAI } from 'openai';

const apiKey = process.env.SUMOPOD_API_KEY;
const baseURL = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
const model = process.env.SUMOPOD_MODEL || 'deepseek-v4-flash';

if (!apiKey) {
  throw new Error('SUMOPOD_API_KEY belum dikonfigurasi.');
}

const sumopod = new OpenAI({
  apiKey,
  baseURL,
});

export async function callSumoPod(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>,
  options: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  } = {}
) {
  const response = await sumopod.chat.completions.create({
    model: options.model ?? model,
    messages,
    max_tokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.2,
  });

  return {
    text: response.choices[0]?.message?.content || '',
    model: response.model,
    usage: response.usage || null,
    raw: response,
  };
}
