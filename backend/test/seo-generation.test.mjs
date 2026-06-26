import test from "node:test";
import assert from "node:assert/strict";
import { buildChunkedPromptStages, buildSeoPrompt } from "../utils/GptPromptBuilder.js";
import { getPlatformPromptProfiles } from "../utils/platformProfiles.mjs";
import { getProductProfile } from "../utils/productProfiles.mjs";
import {
  extractJsonObject,
  getDryRunPayload,
  normalizeSeoResult,
} from "../utils/seoGeneration.mjs";

test("buildSeoPrompt asks for strict JSON output", () => {
  const prompt = buildSeoPrompt("PostPunk", "Automation Tool", "Indie devs", {
    platformIds: ["linkedin"],
    selectedPlatforms: [
      {
        id: "linkedin",
        label: "LinkedIn",
        audienceExpectation: "credible, useful, specific, professional",
        voice: "calm, informed, human, experience-backed",
        structureRules: ["Lead with the insight or problem."],
        ctaStyle: "Invite discussion, feedback, or reflection.",
        avoid: ["sloppy irony"],
      },
    ],
  });
  assert.match(prompt, /Return valid JSON only/);
  assert.match(prompt, /"product_name": "PostPunk"/);
  assert.match(prompt, /"keywords": \[/);
  assert.match(prompt, /Target platforms: linkedin/);
  assert.match(prompt, /LinkedIn/);
  assert.match(prompt, /Lead with the insight or problem/);
  assert.match(prompt, /Pinterest creative guidance/);
  assert.match(prompt, /Suggested post intent:/);
  assert.match(prompt, /Campaign phase:/);
  assert.match(prompt, /"hook_options": \[/);
  assert.match(prompt, /"platform_variants":/);
  assert.match(prompt, /"campaign_phase":/);
  assert.match(prompt, /"headline":/);
  assert.match(prompt, /"ctr_score":/);
  assert.match(prompt, /"intent_layer":/);
  assert.match(prompt, /"intent_primary":/);
  assert.match(prompt, /"awareness_stage":/);
  assert.match(prompt, /"answer_style_description":/);
  assert.match(prompt, /"angle_options":/);
  assert.match(prompt, /"visual_hook":/);
});

test("buildSeoPrompt includes product profile guidance when provided", () => {
  const prompt = buildSeoPrompt("Coloring Books", "Physical products", "Gift buyers", {
    platformIds: ["amazon"],
    selectedPlatforms: [],
    productProfile: {
      label: "Coloring Books",
      category: "Physical products",
      productType: "Printable and paperback coloring books",
      audience: "parents and gift buyers",
      brandVoice: "warm and visual",
      primaryGoal: "sell books",
      promotionChannels: ["amazon", "pinterest"],
      notes: ["Lead with use case"],
    },
  });

  assert.match(prompt, /Product-specific guidance/);
  assert.match(prompt, /Coloring Books/);
  assert.match(prompt, /Lead with use case/);
  assert.match(prompt, /Link and CTA policy/);
  assert.match(prompt, /jab posts/);
  assert.match(prompt, /Campaign phase rules/);
  assert.match(prompt, /Intent and answer framing/);
  assert.match(prompt, /If you're looking for \[problem or goal\]/);
});

test("buildChunkedPromptStages creates small staged prompts", () => {
  const stages = buildChunkedPromptStages("Goblin Core", "Printable pack", "Goblin fans", {
    platformIds: ["facebook", "pinterest"],
    selectedPlatforms: [],
    postIntent: "soft-sell",
    campaignPhase: "launch",
    campaignAngle: "beginner",
  });

  assert.equal(stages.length, 4);
  assert.deepEqual(
    stages.map((stage) => stage.id),
    ["strategy", "discoverability", "copy", "visual"],
  );
  assert.match(stages[0].prompt, /campaign_phase/);
  assert.match(stages[0].prompt, /intent_layer/);
  assert.match(stages[0].prompt, /headline_variants/);
  assert.match(stages[1].prompt, /hook_options/);
  assert.match(stages[1].prompt, /answer_style_description/);
  assert.match(stages[2].prompt, /platform_variants/);
  assert.match(stages[3].prompt, /image_prompt/);
});

test("extractJsonObject parses wrapped JSON", () => {
  const parsed = extractJsonObject('noise before {"hello":"world"} noise after');
  assert.deepEqual(parsed, { hello: "world" });
});

test("normalizeSeoResult fills defaults", () => {
  const normalized = normalizeSeoResult(
    {
      product_name: "PostPunk",
      keywords: ["a", "b"],
      meta_description: "desc",
    },
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
    },
  );

  assert.equal(normalized.slug, "postpunk");
  assert.equal(normalized.product_type, "Automation Tool");
  assert.equal(normalized.audience, "Indie devs");
  assert.equal(normalized.product, "PostPunk");
  assert.equal(normalized.confidence_score, 0);
  assert.equal(normalized.asset_expansion.recommended_image_count, 3);
  assert.equal(normalized.lane_priority.seasonal_affiliate, 40);
  assert.equal(normalized.primary_cta, "");
  assert.equal(normalized.campaign_phase, "");
  assert.equal(normalized.campaign_angle, "");
  assert.equal(normalized.headline, "PostPunk");
  assert.deepEqual(normalized.headline_variants, []);
  assert.equal(normalized.primary_emotion, "");
  assert.equal(normalized.secondary_emotion, "");
  assert.equal(normalized.curiosity_type, "");
  assert.deepEqual(normalized.specificity_signals, {});
  assert.deepEqual(normalized.authority_signals, []);
  assert.deepEqual(normalized.trust_signals, []);
  assert.equal(normalized.pattern_interrupt_type, "");
  assert.equal(normalized.hook_type, "");
  assert.equal(normalized.content_intent, "");
  assert.equal(normalized.search_intent, "PostPunk");
  assert.equal(normalized.save_intent, "");
  assert.equal(normalized.share_intent, "");
  assert.equal(normalized.thumbnail_concept, "");
  assert.equal(normalized.first_line, "");
  assert.deepEqual(normalized.platform_optimizations, {});
  assert.equal(normalized.ctr_score, 0);
  assert.equal(normalized.clarity_score, 0);
  assert.equal(normalized.trust_score, 0);
  assert.equal(normalized.curiosity_score, 0);
  assert.equal(normalized.save_score, 0);
  assert.equal(normalized.share_score, 0);
  assert.equal(typeof normalized.identity_archetype, "string");
  assert.equal(typeof normalized.ecosystem_cluster, "string");
  assert.equal(typeof normalized.future_self_signal, "string");
  assert.equal(typeof normalized.save_reason, "string");
  assert.equal(typeof normalized.utility_type, "string");
  assert.ok(Number.isFinite(normalized.discovery_score));
  assert.ok(Number.isFinite(normalized.retail_commonality_score));
  assert.ok(Number.isFinite(normalized.rabbit_hole_score));
  assert.ok(Number.isFinite(normalized.visual_clarity_score));
  assert.ok(Number.isFinite(normalized.save_potential_score));
  assert.ok(Number.isFinite(normalized.amazon_discovery_score));
  assert.ok(Number.isFinite(normalized.seasonality_score));
  assert.ok(Number.isFinite(normalized.landing_page_match_score));
  assert.equal(typeof normalized.landing_page_match_reason, "string");
  assert.ok(Number.isFinite(normalized.product_fit_score));
  assert.equal(typeof normalized.product_fit_state, "string");
  assert.deepEqual(Array.isArray(normalized.product_fit_reasons), true);
  assert.equal(typeof normalized.product_fit_recommended, "boolean");
  assert.equal(typeof normalized.product_fit_blocked, "boolean");
  assert.equal(normalized.intent_primary, "lifestyle");
  assert.equal(normalized.intent_secondary, "evaluation");
  assert.equal(normalized.awareness_stage, "evaluation");
  assert.equal(normalized.pain_proximity, 0);
  assert.equal(normalized.commerciality_score, 0);
  assert.deepEqual(normalized.emotion_tags, ["ease", "clarity", "less-friction"]);
  assert.deepEqual(normalized.identity_tags, ["indie", "devs"]);
  assert.equal(normalized.query_chain_depth, 0);
  assert.equal(normalized.evergreen_score, 0);
  assert.equal(normalized.jtbd, "Help Indie devs move from lifestyle toward evaluation");
  assert.equal(normalized.pin_angle, "convenience");
  assert.equal(normalized.intent_layer.primary_intent, "");
  assert.equal(normalized.answer_style_description, "");
  assert.equal(normalized.visual_hook, "");
  assert.deepEqual(normalized.hook_options, []);
  assert.equal(normalized.angle_options.problem, "");
  assert.deepEqual(normalized.platforms, ["LinkedIn", "X", "Reddit"]);
  assert.equal(
    normalized.link.utm_base,
    "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__",
  );
});

test("dry run for ollama returns chunked stages without calling network", () => {
  const payload = getDryRunPayload(
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
      platformIds: ["x", "linkedin"],
    },
    {
      provider: "ollama",
      model: "llama3.1:8b",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "ollama");
  assert.equal(payload.model, "llama3.1:8b");
  assert.equal(payload.stages.length, 4);
  assert.match(payload.prompt, /## Strategy/);
  assert.match(payload.prompt, /## Visual/);
});

test("dry run for openai keeps monolithic prompt", () => {
  const payload = getDryRunPayload(
    {
      productName: "PostPunk",
      productType: "Automation Tool",
      audience: "Indie devs",
      platformIds: ["x", "linkedin"],
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
    },
  );

  assert.equal(payload.mode, "dry-run");
  assert.equal(payload.provider, "openai");
  assert.equal(payload.model, "gpt-4o-mini");
  assert.equal(payload.stages, undefined);
  assert.match(payload.prompt, /Target platforms: x, linkedin/);
});

test("Ko-fi plus Amara profile carries fictional-universe guidance into prompts", () => {
  const prompt = buildSeoPrompt(
    "Church Archive Fragment",
    "Dark romantic mythos and serialized gothic universe for Ko-fi",
    "followers drawn to theatrical devotion and gothic intimacy",
    {
      platformIds: ["kofi"],
      selectedPlatforms: getPlatformPromptProfiles(["kofi"]),
      productProfile: getProductProfile("amara-universe-kofi"),
    },
  );

  assert.match(prompt, /Honor fictional universe tone/);
  assert.match(prompt, /Join the archive, support the church, keep the candles lit, preserve forbidden texts/i);
  assert.match(prompt, /forbidden journal entries/i);
  assert.match(prompt, /Do not flatten everything into generic marketing copy/i);
});
