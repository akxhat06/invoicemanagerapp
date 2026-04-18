export type LLMProvider = "groq" | "anthropic" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
}

export function getLLMConfig(provider: LLMProvider): LLMConfig {
  const configs: Record<LLMProvider, LLMConfig> = {
    groq: {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: process.env.GROQ_API_KEY ?? "",
      maxTokens: 1024,
    },
    anthropic: {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      maxTokens: 1024,
    },
    gemini: {
      provider: "gemini",
      model: "gemini-2.0-flash",
      apiKey: process.env.GEMINI_API_KEY ?? "",
      maxTokens: 1024,
    },
  };

  const config = configs[provider];
  if (!config.apiKey) {
    throw new Error(`Missing API key for ${provider}`);
  }
  return config;
}

export async function generateWithLLM(
  provider: LLMProvider,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = getLLMConfig(provider);

  if (config.provider === "groq") {
    return generateWithGroq(config, systemPrompt, userPrompt);
  } else if (config.provider === "anthropic") {
    return generateWithAnthropic(config, systemPrompt, userPrompt);
  } else {
    return generateWithGemini(config, systemPrompt, userPrompt);
  }
}

async function generateWithGroq(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: config.maxTokens,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Groq API error");
  }
  return data.choices[0]?.message?.content ?? "";
}

async function generateWithAnthropic(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Anthropic API error");
  }
  return data.content[0]?.text ?? "";
}

async function generateWithGemini(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: 0.3,
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini API error");
  }
  return data.candidates[0]?.content?.parts[0]?.text ?? "";
}