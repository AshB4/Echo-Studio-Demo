const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_OPENAI_TIMEOUT_MS = 90_000;
const DEFAULT_OLLAMA_TIMEOUT_MS = 120_000;
const OLLAMA_CONNECT_TIMEOUT_MS = 3_000;

function createAiError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getOpenAiApiKey(overrides = {}) {
  return (
    overrides.apiKey ||
    process.env.POSTPUNK_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

function assertOpenAiConfigured(config) {
  if (!config.apiKey) {
    throw createAiError(
      "OpenAI API key not configured.\n\nSet POSTPUNK_OPENAI_API_KEY or OPENAI_API_KEY and restart the backend.",
      500,
    );
  }
}

function supportsOpenAiTemperature(model = "") {
  const normalized = String(model || "").trim().toLowerCase();
  return !normalized.startsWith("gpt-5");
}

function getOpenAiMaxCompletionTokens(model = "", overrides = {}) {
  const configured =
    overrides.maxCompletionTokens ||
    Number(process.env.POSTPUNK_OPENAI_MAX_COMPLETION_TOKENS || process.env.OPENAI_MAX_COMPLETION_TOKENS);
  if (Number.isFinite(configured) && configured > 0) return configured;

  const normalized = String(model || "").trim().toLowerCase();
  return normalized.startsWith("gpt-5") ? 8000 : null;
}

function getOpenAiReasoningEffort(model = "", overrides = {}) {
  const configured =
    overrides.reasoningEffort ||
    process.env.POSTPUNK_OPENAI_REASONING_EFFORT ||
    process.env.OPENAI_REASONING_EFFORT ||
    "";
  if (configured) return configured;

  const normalized = String(model || "").trim().toLowerCase();
  if (normalized.startsWith("gpt-5.5") || normalized.startsWith("gpt-5.1")) return "none";
  return normalized.startsWith("gpt-5") ? "low" : null;
}

function getOpenAiErrorMessage(status, text) {
  try {
    const payload = JSON.parse(text);
    const message = payload?.error?.message || payload?.message;
    if (message) return message;
  } catch {
    // Fall back to raw text below.
  }
  return text || `OpenAI request failed with status ${status}`;
}

export function resolveAiConfig(overrides = {}) {
  const provider = String(
    overrides.provider || process.env.POSTPUNK_AI_PROVIDER || "openai",
  ).toLowerCase();

  if (provider === "openai") {
    const model =
      overrides.model ||
      process.env.POSTPUNK_OPENAI_MODEL ||
      process.env.OPENAI_MODEL ||
      "gpt-4o-mini";
    return {
      provider,
      model,
      baseUrl:
        overrides.baseUrl ||
        process.env.POSTPUNK_OPENAI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        DEFAULT_OPENAI_BASE_URL,
      apiKey:
        getOpenAiApiKey(overrides),
      timeoutMs:
        overrides.timeoutMs ||
        Number(process.env.POSTPUNK_OPENAI_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS) ||
        DEFAULT_OPENAI_TIMEOUT_MS,
      maxCompletionTokens: getOpenAiMaxCompletionTokens(model, overrides),
      reasoningEffort: getOpenAiReasoningEffort(model, overrides),
    };
  }

  if (provider === "ollama") {
    return {
      provider,
      model:
        overrides.model ||
        process.env.POSTPUNK_OLLAMA_MODEL ||
        process.env.OLLAMA_MODEL ||
        "stable-code:3b-code-q4_0",
      baseUrl:
        overrides.baseUrl ||
        process.env.POSTPUNK_OLLAMA_BASE_URL ||
        process.env.OLLAMA_HOST ||
        DEFAULT_OLLAMA_BASE_URL,
      apiKey: "",
      timeoutMs:
        overrides.timeoutMs ||
        Number(process.env.POSTPUNK_OLLAMA_TIMEOUT_MS || process.env.OLLAMA_TIMEOUT_MS) ||
        DEFAULT_OLLAMA_TIMEOUT_MS,
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function callOpenAI(config, prompt) {
  assertOpenAiConfigured(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_OPENAI_TIMEOUT_MS);
  let response;
  const requestBody = {
    model: config.model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a structured SEO assistant. Return valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };
  if (supportsOpenAiTemperature(config.model)) {
    requestBody.temperature = 0.4;
  }
  if (config.maxCompletionTokens) {
    requestBody.max_completion_tokens = config.maxCompletionTokens;
  }
  if (config.reasoningEffort) {
    requestBody.reasoning_effort = config.reasoningEffort;
  }
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createAiError(
        `OpenAI took too long to respond (${config.timeoutMs}ms). Try a shorter prompt, a smaller output, or increase POSTPUNK_OPENAI_TIMEOUT_MS.`,
        504,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    const upstreamMessage = getOpenAiErrorMessage(response.status, text);
    if (response.status === 401 || response.status === 403) {
      throw createAiError("OpenAI authentication failed. Check POSTPUNK_OPENAI_API_KEY or OPENAI_API_KEY and restart the backend.", response.status);
    }
    if (response.status === 404) {
      throw createAiError(`OpenAI model not found: ${config.model}. Set POSTPUNK_OPENAI_MODEL or OPENAI_MODEL to an available model and restart the backend.`, response.status);
    }
    throw createAiError(`OpenAI request failed: ${upstreamMessage}`, response.status);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function assertOllamaAvailable(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_CONNECT_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/tags`, {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Ollama health check failed: ${response.status}`);
    }
  } catch (error) {
    throw createAiError(
      "Unable to connect to Ollama.\n\nEither start Ollama or set POSTPUNK_AI_PROVIDER=openai.",
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function callOllama(config, prompt) {
  await assertOllamaAvailable(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || DEFAULT_OLLAMA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.4,
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        `Ollama took too long to respond (${config.timeoutMs}ms). Try a lighter model, a shorter prompt, or OpenAI.`,
      );
    }
    const timeoutCode =
      error?.cause?.code ||
      error?.code ||
      "";
    if (timeoutCode === "UND_ERR_HEADERS_TIMEOUT") {
      throw new Error(
        `Ollama timed out waiting for response headers. Try a lighter model, a shorter prompt, or increase POSTPUNK_OLLAMA_TIMEOUT_MS.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data?.response || "";
}

export async function generateStructuredText(prompt, overrides = {}) {
  const config = resolveAiConfig(overrides);
  console.log("[AI] Generation started", {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
  });
  if (config.provider === "openai") {
    return callOpenAI(config, prompt);
  }
  return callOllama(config, prompt);
}
