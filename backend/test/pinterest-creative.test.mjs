import test from "node:test";
import assert from "node:assert/strict";
import {
  enrichPinterestCreativeResult,
} from "../utils/pinterestCreative.mjs";
import { buildPinterestCreativeLayer } from "../utils/GptPromptBuilder.js";

test("Pinterest guidance surfaces recent hooks and lanes", () => {
  const guidance = buildPinterestCreativeLayer({
    enabled: true,
    trigger: "peace/quiet",
    category: "home/garden affiliate",
    categoryThrottleCount: 3,
    recentHooks: ["Safe Water Play for Little Ones"],
    recentVisuals: ["same goblin art"],
    priorityLanes: ["seasonal affiliate", "home/garden affiliate"],
  });

  assert.match(guidance, /Trigger lane: peace\/quiet/);
  assert.match(guidance, /Category throttle: 3 recent pin\(s\)/);
  assert.match(guidance, /Safe Water Play for Little Ones/);
  assert.match(guidance, /same goblin art/);
});

test("Pinterest creative enrichment rewrites near duplicates", () => {
  const result = enrichPinterestCreativeResult(
    {
      product_name: "Splash Mat",
      product: "Splash Mat",
      hook: "Safe Water Play for Little Ones",
      visual_style: "same image style",
      image_concept: "same image style",
      destination_url: "https://example.com/pin",
    },
    {
      productName: "Splash Mat",
      productType: "Backyard water toy",
      audience: "parents",
      productProfileId: "buzzing-adventures-coloring-book",
    },
    {
      enabled: true,
      trigger: "peace/quiet",
      category: "home/garden affiliate",
      categoryThrottleCount: 3,
      recentHistory: [
        {
          hook: "Safe Water Play for Little Ones",
          visualStyle: "same image style",
          category: "home/garden affiliate",
          timestamp: Date.now(),
        },
      ],
      recentHooks: ["Safe Water Play for Little Ones"],
      recentVisuals: ["same image style"],
      priorityLanes: ["seasonal affiliate", "home/garden affiliate"],
    },
  );

  assert.notEqual(result.hook, "Safe Water Play for Little Ones");
  assert.notEqual(result.visual_style, "same image style");
  assert.equal(result.category_throttle_hit, true);
  assert.ok(result.confidence_score <= 99);
  assert.ok(Array.isArray(result.emotion_tags));
  assert.ok(Array.isArray(result.identity_tags));
  assert.ok(result.intent_primary.length > 0);
  assert.ok(result.awareness_stage.length > 0);
  assert.ok(result.pin_angle.length > 0);
  assert.ok(Array.isArray(result.winner_expansion.adjacent_variations));
  assert.equal(result.asset_expansion.recommended_image_count, 3);
  assert.ok(result.asset_expansion.same_product_variants.length > 0);
  assert.ok(result.image_prompt_variants.ugc_style.length > 0);
  assert.ok(result.identity_archetype.length > 0);
  assert.ok(result.ecosystem_cluster.length > 0);
  assert.ok(result.utility_type.length > 0);
  assert.ok(result.save_reason.length > 0);
  assert.ok(Number.isFinite(result.discovery_score));
  assert.ok(Number.isFinite(result.retail_commonality_score));
  assert.ok(Number.isFinite(result.rabbit_hole_score));
  assert.ok(Number.isFinite(result.visual_clarity_score));
  assert.ok(Number.isFinite(result.save_potential_score));
  assert.ok(Number.isFinite(result.amazon_discovery_score));
  assert.ok(Number.isFinite(result.seasonality_score));
  assert.ok(Number.isFinite(result.landing_page_match_score));
  assert.ok(result.landing_page_match_reason.length > 0);
  assert.ok(Number.isFinite(result.product_fit_score));
  assert.ok(result.product_fit_state.length > 0);
});
