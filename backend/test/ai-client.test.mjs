import test from "node:test";
import assert from "node:assert/strict";
import { generateStructuredText, resolveAiConfig } from "../utils/aiClient.mjs";

function withCleanAiEnv(fn) {
  const previous = {
    POSTPUNK_AI_PROVIDER: process.env.POSTPUNK_AI_PROVIDER,
    POSTPUNK_OPENAI_API_KEY: process.env.POSTPUNK_OPENAI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    POSTPUNK_OPENAI_MODEL: process.env.POSTPUNK_OPENAI_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };
  delete process.env.POSTPUNK_AI_PROVIDER;
  delete process.env.POSTPUNK_OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.POSTPUNK_OPENAI_MODEL;
  delete process.env.OPENAI_MODEL;
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("AI client defaults to OpenAI for campaign generation reliability", () => {
  withCleanAiEnv(() => {
    const config = resolveAiConfig();
    assert.equal(config.provider, "openai");
    assert.equal(config.model, "gpt-4o-mini");
    assert.equal(config.baseUrl, "https://api.openai.com/v1");
  });
});

test("OpenAI provider fails fast when no API key is configured", async () => {
  await withCleanAiEnv(async () => {
    await assert.rejects(
      () => generateStructuredText("{}", { provider: "openai" }),
      /OpenAI API key not configured/,
    );
  });
});

test("GPT-5 family OpenAI requests omit temperature", async () => {
  const originalFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    await generateStructuredText("{}", {
      provider: "openai",
      model: "gpt-5.5",
      apiKey: "test-key",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(body.model, "gpt-5.5");
  assert.equal(Object.hasOwn(body, "temperature"), false);
  assert.equal(body.max_completion_tokens, 8000);
  assert.equal(body.reasoning_effort, "none");
});

test("non GPT-5 OpenAI requests preserve temperature", async () => {
  const originalFetch = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    await generateStructuredText("{}", {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.temperature, 0.4);
  assert.equal(Object.hasOwn(body, "max_completion_tokens"), false);
  assert.equal(Object.hasOwn(body, "reasoning_effort"), false);
});

test("OpenAI upstream errors keep status and safe message", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: "Unsupported value: 'temperature' does not support 0.4 with this model.",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );

  try {
    await assert.rejects(
      () => generateStructuredText("{}", {
        provider: "openai",
        model: "gpt-4o-mini",
        apiKey: "test-key",
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Unsupported value/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
