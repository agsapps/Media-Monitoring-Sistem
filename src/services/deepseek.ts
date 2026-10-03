import 'dotenv/config';

const getDeepSeekConfig = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY belum dikonfigurasi.');
  }

  return { apiKey, baseURL, model };
};

export async function callDeepSeek(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
) {
  const { apiKey, baseURL, model } = getDeepSeekConfig();

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `SumoPod DeepSeek API Error (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    text: data?.choices?.[0]?.message?.content || '',
    model: data?.model || model,
    usage: data?.usage || null,
    raw: data,
  };
}
