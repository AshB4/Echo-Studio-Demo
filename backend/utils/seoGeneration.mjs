import {
  buildChunkedPromptStages,
  buildCopyStagePrompt,
  buildDiscoverabilityStagePrompt,
  buildSeoPrompt,
  buildStrategyStagePrompt,
  buildVisualStagePrompt,
} from "./GptPromptBuilder.js";
import { generateStructuredText, resolveAiConfig } from "./aiClient.mjs";
import {
  buildPinterestCreativeContext,
  enrichPinterestCreativeResult,
} from "./pinterestCreative.mjs";
import { getPlatformPromptProfiles } from "./platformProfiles.mjs";
import { getProductProfile } from "./productProfiles.mjs";

export function extractJsonObject(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("AI response was empty");
  }

  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("AI response did not contain valid JSON");
    }
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
}

export function normalizeSeoResult(raw, input, context = null) {
  const hashtags =
    raw.hashtags && typeof raw.hashtags === "object" ? raw.hashtags : {};
  const imageRequirements =
    raw.image_requirements && typeof raw.image_requirements === "object"
      ? raw.image_requirements
      : {};
  const preferredPostTimes =
    raw.preferred_post_times && typeof raw.preferred_post_times === "object"
      ? raw.preferred_post_times
      : {};
  const links = raw.link && typeof raw.link === "object" ? raw.link : {};
  const intentLayer =
    raw.intent_layer && typeof raw.intent_layer === "object" ? raw.intent_layer : {};
  const angleOptions =
    raw.angle_options && typeof raw.angle_options === "object" ? raw.angle_options : {};
  const specificitySignals =
    raw.specificity_signals && typeof raw.specificity_signals === "object"
      ? raw.specificity_signals
      : {};
  const platformOptimizations =
    raw.platform_optimizations && typeof raw.platform_optimizations === "object"
      ? raw.platform_optimizations
      : {};
  const headlineVariants = Array.isArray(raw.headline_variants)
    ? raw.headline_variants.filter(Boolean)
    : Array.isArray(raw.headlineVariants)
      ? raw.headlineVariants.filter(Boolean)
      : [];
  const authoritySignals = Array.isArray(raw.authority_signals)
    ? raw.authority_signals.filter(Boolean)
    : Array.isArray(raw.authoritySignals)
      ? raw.authoritySignals.filter(Boolean)
      : [];
  const trustSignals = Array.isArray(raw.trust_signals)
    ? raw.trust_signals.filter(Boolean)
    : Array.isArray(raw.trustSignals)
      ? raw.trustSignals.filter(Boolean)
      : [];
  const emotionTags = Array.isArray(raw.emotion_tags) ? raw.emotion_tags.filter(Boolean) : [];
  const identityTags = Array.isArray(raw.identity_tags) ? raw.identity_tags.filter(Boolean) : [];
  const productFitReasons = Array.isArray(raw.product_fit_reasons)
    ? raw.product_fit_reasons.filter(Boolean)
    : Array.isArray(raw.productFitReasons)
      ? raw.productFitReasons.filter(Boolean)
      : [];

  const normalized = {
    product_name: raw.product_name || input.productName,
    slug: raw.slug || input.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    product_type: raw.product_type || input.productType,
    audience: raw.audience || input.audience,
    product: raw.product || input.productName,
    psychological_trigger: raw.psychological_trigger || "",
    hook: raw.hook || raw.hook_options?.[0] || "",
    visual_style: raw.visual_style || raw.image_concept || raw.visual_hook || "",
    category: raw.category || "",
    destination_url: raw.destination_url || "",
    confidence_score: Number.isFinite(Number(raw.confidence_score)) ? Number(raw.confidence_score) : 0,
    post_intent: raw.post_intent || "",
    campaign_phase: raw.campaign_phase || input.campaignPhase || "",
    campaign_angle: raw.campaign_angle || "",
    headline: raw.headline || raw.product_name || input.productName,
    headline_variants: headlineVariants,
    primary_emotion: raw.primary_emotion || "",
    secondary_emotion: raw.secondary_emotion || "",
    curiosity_type: raw.curiosity_type || "",
    specificity_signals: specificitySignals,
    authority_signals: authoritySignals,
    trust_signals: trustSignals,
    pattern_interrupt_type: raw.pattern_interrupt_type || "",
    hook_type: raw.hook_type || "",
    content_intent: raw.content_intent || "",
    search_intent: raw.search_intent || raw.searchIntent || input.productName || "",
    save_intent: raw.save_intent || "",
    share_intent: raw.share_intent || "",
    thumbnail_concept: raw.thumbnail_concept || "",
    first_line: raw.first_line || raw.hook || "",
    platform_optimizations: platformOptimizations,
    ctr_score: Number.isFinite(Number(raw.ctr_score)) ? Number(raw.ctr_score) : 0,
    clarity_score: Number.isFinite(Number(raw.clarity_score)) ? Number(raw.clarity_score) : 0,
    trust_score: Number.isFinite(Number(raw.trust_score)) ? Number(raw.trust_score) : 0,
    curiosity_score: Number.isFinite(Number(raw.curiosity_score)) ? Number(raw.curiosity_score) : 0,
    save_score: Number.isFinite(Number(raw.save_score)) ? Number(raw.save_score) : 0,
    share_score: Number.isFinite(Number(raw.share_score)) ? Number(raw.share_score) : 0,
    identity_archetype: raw.identity_archetype || "",
    ecosystem_cluster: raw.ecosystem_cluster || "",
    future_self_signal: raw.future_self_signal || "",
    save_reason: raw.save_reason || "",
    utility_type: raw.utility_type || "",
    discovery_score: Number.isFinite(Number(raw.discovery_score)) ? Number(raw.discovery_score) : 0,
    retail_commonality_score: Number.isFinite(Number(raw.retail_commonality_score))
      ? Number(raw.retail_commonality_score)
      : 0,
    rabbit_hole_score: Number.isFinite(Number(raw.rabbit_hole_score)) ? Number(raw.rabbit_hole_score) : 0,
    visual_clarity_score: Number.isFinite(Number(raw.visual_clarity_score))
      ? Number(raw.visual_clarity_score)
      : 0,
    save_potential_score: Number.isFinite(Number(raw.save_potential_score))
      ? Number(raw.save_potential_score)
      : 0,
    amazon_discovery_score: Number.isFinite(Number(raw.amazon_discovery_score))
      ? Number(raw.amazon_discovery_score)
      : 0,
    seasonality_score: Number.isFinite(Number(raw.seasonality_score))
      ? Number(raw.seasonality_score)
      : 0,
    landing_page_match_score: Number.isFinite(Number(raw.landing_page_match_score))
      ? Number(raw.landing_page_match_score)
      : 0,
    landing_page_match_reason: raw.landing_page_match_reason || "",
    product_fit_score: Number.isFinite(Number(raw.product_fit_score))
      ? Number(raw.product_fit_score)
      : 0,
    product_fit_state: raw.product_fit_state || "",
    product_fit_reasons: productFitReasons,
    product_fit_recommended:
      typeof raw.product_fit_recommended === "boolean"
        ? raw.product_fit_recommended
        : Boolean(raw.productFitRecommended),
    product_fit_blocked:
      typeof raw.product_fit_blocked === "boolean"
        ? raw.product_fit_blocked
        : Boolean(raw.productFitBlocked),
    intent_primary: raw.intent_primary || intentLayer.primary_intent || "",
    intent_secondary: raw.intent_secondary || "",
    awareness_stage: raw.awareness_stage || "",
    pain_proximity: Number.isFinite(Number(raw.pain_proximity)) ? Number(raw.pain_proximity) : 0,
    commerciality_score: Number.isFinite(Number(raw.commerciality_score))
      ? Number(raw.commerciality_score)
      : 0,
    emotion_tags: emotionTags,
    identity_tags: identityTags,
    query_chain_depth: Number.isFinite(Number(raw.query_chain_depth)) ? Number(raw.query_chain_depth) : 0,
    evergreen_score: Number.isFinite(Number(raw.evergreen_score))
      ? Number(raw.evergreen_score)
      : Number.isFinite(Number(raw.evergreenScore))
        ? Number(raw.evergreenScore)
        : 0,
    jtbd: raw.jtbd || "",
    pin_angle: raw.pin_angle || raw.campaign_angle || "",
    intent_layer: {
      primary_intent: intentLayer.primary_intent || "",
      keyword_focus: intentLayer.keyword_focus || "",
      use_case: intentLayer.use_case || "",
      audience_segment: intentLayer.audience_segment || "",
    },
    core_problem: raw.core_problem || "",
    core_promise: raw.core_promise || "",
    cta_mode: raw.cta_mode || "",
    primary_cta: raw.primary_cta || "",
    secondary_cta: raw.secondary_cta || "",
    answer_style_description: raw.answer_style_description || "",
    hook_options: Array.isArray(raw.hook_options) ? raw.hook_options.filter(Boolean) : [],
    angle_options: {
      problem: angleOptions.problem || "",
      aesthetic: angleOptions.aesthetic || "",
      beginner: angleOptions.beginner || "",
      comparison: angleOptions.comparison || "",
    },
    platforms: Array.isArray(raw.platforms) && raw.platforms.length ? raw.platforms : ["LinkedIn", "X", "Reddit"],
    desperate_search_queries: Array.isArray(raw.desperate_search_queries)
      ? raw.desperate_search_queries.filter(Boolean)
      : [],
    unaware_search_questions: Array.isArray(raw.unaware_search_questions)
      ? raw.unaware_search_questions.filter(Boolean)
      : [],
    seo_human_pitch: raw.seo_human_pitch || "",
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean) : [],
    hashtags,
    meta_description: raw.meta_description || "",
    alt_text_examples: Array.isArray(raw.alt_text_examples)
      ? raw.alt_text_examples.filter(Boolean)
      : [],
    visual_hook: raw.visual_hook || "",
    image_concept: raw.image_concept || "",
    image_prompt: raw.image_prompt || "",
    image_requirements: imageRequirements,
    asset_expansion: raw.asset_expansion || null,
    winner_expansion: raw.winner_expansion || null,
    lane_priority: raw.lane_priority || null,
    seasonality: raw.seasonality || null,
    image_prompt_variants: raw.image_prompt_variants || null,
    ip_repurposing: raw.ip_repurposing || null,
    platform_variants:
      raw.platform_variants && typeof raw.platform_variants === "object"
        ? raw.platform_variants
        : {},
    preferred_post_times: preferredPostTimes,
    link: {
      gumroad: links.gumroad || "",
      amazon: links.amazon || "",
      utm_base:
        links.utm_base ||
        "?utm_source=__PLATFORM__&utm_medium=social&utm_campaign=__CAMPAIGN__",
    },
    campaigns: Array.isArray(raw.campaigns) ? raw.campaigns : [],
  };

  return enrichPinterestCreativeResult(normalized, input, context);
}

function buildPromptContext(input, options = {}) {
  const platformIds = Array.isArray(input.platformIds) ? input.platformIds : [];
  const selectedPlatforms = getPlatformPromptProfiles(platformIds);
  const productProfile = getProductProfile(input.productProfileId);
  return {
    platformIds,
    selectedPlatforms,
    productProfile,
    postIntent: input.postIntent,
    campaignPhase: input.campaignPhase,
    campaignAngle: input.campaignAngle,
    visualHook: input.visualHook,
    pinterestCreativeContext: options.pinterestCreativeContext || null,
  };
}

async function runChunkedSeoGeneration(input, options = {}, context = {}) {
  const strategyPrompt = buildStrategyStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
  );
  const strategy = extractJsonObject(await generateStructuredText(strategyPrompt, options));

  const discoverabilityPrompt = buildDiscoverabilityStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
  );
  const discoverability = extractJsonObject(
    await generateStructuredText(discoverabilityPrompt, options),
  );

  const copyPrompt = buildCopyStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
    discoverability,
  );
  const copy = extractJsonObject(await generateStructuredText(copyPrompt, options));

  const visualPrompt = buildVisualStagePrompt(
    input.productName,
    input.productType,
    input.audience,
    context,
    strategy,
  );
  const visual = extractJsonObject(await generateStructuredText(visualPrompt, options));

  return {
    product_name: input.productName,
    product_type: input.productType,
    audience: input.audience,
    ...strategy,
    ...discoverability,
    ...copy,
    ...visual,
  };
}

export async function generateSeoPayload(input, options = {}) {
  const pinterestCreativeContext =
    options.pinterestCreativeContext || (await buildPinterestCreativeContext(input));
  const context = buildPromptContext(input, { ...options, pinterestCreativeContext });
  const config = resolveAiConfig(options);
  const parsed =
    config.provider === "ollama"
      ? await runChunkedSeoGeneration(input, options, context)
      : extractJsonObject(
          await generateStructuredText(
            buildSeoPrompt(input.productName, input.productType, input.audience, context),
            options,
          ),
        );
  return normalizeSeoResult(parsed, input, pinterestCreativeContext);
}

export function getDryRunPayload(input, options = {}) {
  const config = resolveAiConfig(options);
  const context = buildPromptContext(input, options);
  if (config.provider === "ollama") {
    const stages = buildChunkedPromptStages(
      input.productName,
      input.productType,
      input.audience,
      context,
    );
    return {
      mode: "dry-run",
      provider: config.provider,
      model: config.model,
      prompt: stages
        .map((stage) => `## ${stage.label}\n${stage.prompt}`)
        .join("\n\n"),
      stages,
    };
  }
  return {
    mode: "dry-run",
    provider: config.provider,
    model: config.model,
    prompt: buildSeoPrompt(input.productName, input.productType, input.audience, context),
  };
}
