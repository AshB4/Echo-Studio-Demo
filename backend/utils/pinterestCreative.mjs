import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { getProductProfile, productProfiles } from "./productProfiles.mjs";
import { listPosts, listPostedLog } from "./localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..");
const PINTEREST_LOOKBACK_LIMIT = 50;
const PINTEREST_CATEGORY_THROTTLE_LIMIT = 3;
const PINTEREST_CATEGORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PINTEREST_PRODUCT_FIT_BLOCK_THRESHOLD = 4;
const PINTEREST_PRODUCT_FIT_RECOMMEND_THRESHOLD = 7;

const PRIORITY_LANES = [
  "seasonal affiliate",
  "home/garden affiliate",
  "dev products",
  "goblin printables",
  "coloring books",
];

const LANE_PRIORITY = {
  seasonal_affiliate: 40,
  home_garden_affiliate: 25,
  goblin_ip: 20,
  dev_products: 10,
  experimental: 5,
};

const GENERIC_RETAIL_TERMS = [
  "gift",
  "gift guide",
  "best",
  "top",
  "candle",
  "mug",
  "blanket",
  "charger",
  "speaker",
  "lamp",
  "planner",
  "notebook",
  "wallet",
  "bottle",
  "water bottle",
  "headphones",
  "calendar",
  "electronics",
  "camping gear",
];

const RABBIT_HOLE_TERMS = [
  "magnetic",
  "modular",
  "levitating",
  "electric whiskey smoker",
  "whiskey smoker",
  "rangefinder",
  "flat edc flashlight",
  "edc",
  "oscillating camping fan lantern",
  "desk whiteboard wireless charger",
  "tiny upgrade",
  "micro upgrade",
  "garage gadget",
  "hobby upgrade",
  "productivity toy",
];

const CLUSTER_RULES = [
  {
    cluster: "masculine luxury",
    terms: ["whiskey", "smoker", "golf", "edc", "leather", "desk", "bar", "ritual"],
    archetype: "taste-driven upgrader",
    utility: "ritual-tool",
    futureSelf: "feels more intentional, expensive, and put-together",
  },
  {
    cluster: "cozy productivity",
    terms: ["desk", "wireless charger", "monitor", "calendar", "workspace", "home office", "productivity"],
    archetype: "calm operator",
    utility: "organization-tool",
    futureSelf: "works with less friction and more control",
  },
  {
    cluster: "desk optimization",
    terms: ["desk", "whiteboard", "charger", "mouse", "keyboard", "monitor", "workspace"],
    archetype: "desk optimizer",
    utility: "organization-tool",
    futureSelf: "turns a messy desk into a system",
  },
  {
    cluster: "tactical-lite utility",
    terms: ["flashlight", "edc", "modular", "magnetic", "tool", "carry", "sling", "pack"],
    archetype: "utility tinkerer",
    utility: "problem-fixer",
    futureSelf: "has a smarter, more capable everyday carry",
  },
  {
    cluster: "outdoor comfort",
    terms: ["camp", "camping", "patio", "backyard", "outdoor", "travel", "road trip", "fan", "lantern"],
    archetype: "outdoor comfort seeker",
    utility: "comfort-upgrade",
    futureSelf: "enjoys the outside without the usual annoyance",
  },
  {
    cluster: "garage gadgets",
    terms: ["garage", "shop", "workbench", "tool", "magnetic", "drill", "utility"],
    archetype: "garage builder",
    utility: "problem-fixer",
    futureSelf: "has a garage that behaves like a workshop",
  },
  {
    cluster: "hobby micro-upgrades",
    terms: ["rangefinder", "golf", "hobby", "kit", "accessory", "strap", "smoker"],
    archetype: "hobby upgrader",
    utility: "tiny-upgrade",
    futureSelf: "makes one hobby feel more dialed in",
  },
  {
    cluster: "whiskey rituals",
    terms: ["whiskey", "smoker", "bar", "cocktail", "bourbon", "glass", "ritual"],
    archetype: "ritual-minded adult",
    utility: "ritual-tool",
    futureSelf: "makes a small ritual feel premium",
  },
  {
    cluster: "golf upgrades",
    terms: ["golf", "rangefinder", "strap", "tee", "cart", "green"],
    archetype: "golf upgrader",
    utility: "tiny-upgrade",
    futureSelf: "plays with better feel and less clutter",
  },
  {
    cluster: "aesthetic utility",
    terms: ["beautiful", "aesthetic", "nice", "cute", "stylish", "minimal", "design", "globe"],
    archetype: "taste-driven organizer",
    utility: "identity-boost",
    futureSelf: "likes what they use every day",
  },
  {
    cluster: "practical transformation",
    terms: ["before", "after", "transform", "upgrade", "fix", "solve", "better"],
    archetype: "problem solver",
    utility: "problem-fixer",
    futureSelf: "feels the improvement immediately",
  },
];

function clampScore(value, min = 0, max = 10) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function scoreTerms(text, terms = []) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;
  let score = 0;
  for (const term of terms) {
    if (normalized.includes(normalizeText(term))) score += 1;
  }
  return score;
}

function pickCluster(text, productProfile) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, productProfile?.audience].filter(Boolean).join(" "));
  let winner = {
    cluster: "practical transformation",
    archetype: "future planner",
    utility: "problem-fixer",
    futureSelf: "makes a useful upgrade feel obvious",
    score: 0,
  };
  for (const rule of CLUSTER_RULES) {
    const score = scoreTerms(source, rule.terms);
    if (score > winner.score) {
      winner = {
        cluster: rule.cluster,
        archetype: rule.archetype,
        utility: rule.utility,
        futureSelf: rule.futureSelf,
        score,
      };
    }
  }
  if (winner.score === 0 && productProfile?.category === "Physical products") {
    return {
      cluster: "aesthetic utility",
      archetype: "taste-driven organizer",
      utility: "identity-boost",
      futureSelf: "wants the thing that looks good and works",
      score: 1,
    };
  }
  return winner;
}

function inferIdentityArchetype(text, productProfile, cluster) {
  const source = normalizeText([text, productProfile?.label, productProfile?.audience].filter(Boolean).join(" "));
  if (/golf/.test(source)) return "golf upgrader";
  if (/whiskey|bourbon|bar|cocktail/.test(source)) return "ritual-minded adult";
  if (/desk|workspace|office|productivity/.test(source)) return "desk optimizer";
  if (/camp|outdoor|backyard|patio|travel/.test(source)) return "outdoor comfort seeker";
  if (/garage|shop|tool|workbench/.test(source)) return "garage builder";
  if (/flashlight|edc|magnetic|modular/.test(source)) return "utility tinkerer";
  if (/coloring|printable|affirmation|goblin/.test(source)) return "comfort-focused creator";
  return cluster?.archetype || cluster?.identityArchetype || "future planner";
}

function inferUtilityType(text, productProfile, cluster) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType].filter(Boolean).join(" "));
  if (/before|after|transform|upgrade|fix/.test(source)) return "problem-fixer";
  if (/ritual|whiskey|cocktail|bar/.test(source)) return "ritual-tool";
  if (/desk|workspace|organize|calendar|charger/.test(source)) return "organization-tool";
  if (/camp|outdoor|patio|travel|backyard/.test(source)) return "comfort-upgrade";
  if (/golf|rangefinder|strap|accessory/.test(source)) return "tiny-upgrade";
  if (/magnetic|modular|flashlight|edc|tool/.test(source)) return "problem-fixer";
  return cluster?.utility || cluster?.utilityType || "tiny-upgrade";
}

function inferEcosystemCluster(text, productProfile, trigger, category) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category, trigger].filter(Boolean).join(" "));
  for (const rule of CLUSTER_RULES) {
    if (rule.terms.some((term) => source.includes(normalizeText(term)))) {
      return rule.cluster;
    }
  }
  if (productProfile?.category === "Physical products") return "aesthetic utility";
  return "practical transformation";
}

function scoreRetailCommonality(text, productProfile, category) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category].filter(Boolean).join(" "));
  const genericHits = scoreTerms(source, GENERIC_RETAIL_TERMS);
  const rabbitHoleHits = scoreTerms(source, RABBIT_HOLE_TERMS);
  const physicalBonus = productProfile?.category === "Physical products" ? 1 : 0;
  const categoryPenalty =
    /seasonal affiliate|home\/garden affiliate/.test(String(category || "")) ? 1 : 0;
  return clampScore(5 + genericHits * 1.5 + physicalBonus + categoryPenalty - rabbitHoleHits * 0.75);
}

function scoreRabbitHole(text, productProfile, category) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category].filter(Boolean).join(" "));
  const rabbitHoleHits = scoreTerms(source, RABBIT_HOLE_TERMS);
  const nicheSignals = [
    /magnetic/,
    /modular/,
    /levitating/,
    /whiskey/,
    /smoker/,
    /rangefinder/,
    /edc/,
    /garage/,
    /golf/,
    /desk/,
    /backyard/,
    /patio/,
    /camp/,
    /fan lantern/,
    /whiteboard/,
  ].reduce((sum, pattern) => sum + (pattern.test(source) ? 1 : 0), 0);
  const retailPenalty = scoreTerms(source, GENERIC_RETAIL_TERMS) * 0.75;
  return clampScore(3 + rabbitHoleHits * 1.5 + nicheSignals * 0.75 - retailPenalty);
}

function scoreVisualClarity(text, productProfile, category) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category].filter(Boolean).join(" "));
  const objectSignals = [
    /strap/,
    /charger/,
    /flashlight/,
    /thermometer/,
    /fan/,
    /lantern/,
    /smoker/,
    /globe/,
    /whiteboard/,
    /book/,
    /book series/,
    /mask/,
    /mat/,
    /tool/,
  ].reduce((sum, pattern) => sum + (pattern.test(source) ? 1 : 0), 0);
  const clutterPenalty = scoreTerms(source, ["guide", "gift", "ideas", "generic", "bundle"]) * 0.5;
  const digitalPenalty = productProfile?.category === "Devtools" ? 1 : 0;
  return clampScore(4 + objectSignals * 1.2 - clutterPenalty - digitalPenalty);
}

function scoreSavePotential({ utilityType, ecosystemCluster, productProfile, category }) {
  const source = normalizeText([utilityType, ecosystemCluster, productProfile?.category, category].filter(Boolean).join(" "));
  let score = 4;
  if (/organization|problem-fixer|comfort-upgrade|ritual-tool/.test(source)) score += 2;
  if (/aesthetic utility|desk optimization|cozy productivity|outdoor comfort|garage gadgets|golf upgrades/.test(source)) score += 2;
  if (/devtools/.test(normalizeText(productProfile?.category || ""))) score += 1;
  if (/gift/.test(source)) score -= 1;
  return clampScore(score);
}

function scoreAmazonDiscovery({ destinationUrl, productProfile, category, rabbitHoleScore }) {
  const destination = normalizeText(destinationUrl);
  const source = normalizeText([productProfile?.label, productProfile?.productType, category].filter(Boolean).join(" "));
  let score = 2;
  if (/amazon\.com/.test(destination)) score += 4;
  if (productProfile?.links?.amazon) score += 2;
  if (productProfile?.category === "Physical products") score += 1;
  if (rabbitHoleScore >= 7) score += 1;
  if (/gift guide|generic|retail/.test(source)) score -= 1;
  return clampScore(score);
}

function scoreSeasonality(text, productProfile, category, trigger) {
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category, trigger].filter(Boolean).join(" "));
  if (/father|dad|golf|summer|backyard|patio|camp|outdoor|holiday|christmas|halloween/.test(source)) {
    return 8;
  }
  if (productProfile?.category === "Physical products") return 6;
  return 3;
}

function assessLandingPageMatch({ destinationUrl, productProfile, text, category }) {
  const destination = String(destinationUrl || "").trim();
  if (!destination) {
    return {
      landing_page_match_score: 0,
      landing_page_match_reason: "missing destination URL",
    };
  }

  const normalizedDestination = normalizeText(destination);
  const source = normalizeText([text, productProfile?.label, productProfile?.productType, category].filter(Boolean).join(" "));
  const allowedMatches = [
    productProfile?.links?.primary,
    productProfile?.links?.amazon,
    productProfile?.links?.gumroad,
  ]
    .filter(Boolean)
    .some((candidate) => normalizeText(candidate) === normalizedDestination);

  if (allowedMatches) {
    return {
      landing_page_match_score: 10,
      landing_page_match_reason: "matches product profile link",
    };
  }

  if (/amazon\.com/.test(normalizedDestination) && productProfile?.links?.amazon) {
    return {
      landing_page_match_score: 9,
      landing_page_match_reason: "Amazon destination matches a physical product lane",
    };
  }

  if (/gumroad\.com/.test(normalizedDestination) && productProfile?.links?.gumroad) {
    return {
      landing_page_match_score: 9,
      landing_page_match_reason: "Gumroad destination matches a digital product lane",
    };
  }

  if (source && normalizedDestination.includes(source.split(" ").slice(0, 2).join(" "))) {
    return {
      landing_page_match_score: 7,
      landing_page_match_reason: "destination and product naming are loosely aligned",
    };
  }

  return {
    landing_page_match_score: 4,
    landing_page_match_reason: "destination exists but is not obviously aligned",
  };
}

function assessPinterestProductFit({ text, destinationUrl, productProfile, trigger, category }) {
  const ecosystemCluster = inferEcosystemCluster(text, productProfile, trigger, category);
  const clusterInfo = CLUSTER_RULES.find((rule) => rule.cluster === ecosystemCluster) || null;
  const identityArchetype = inferIdentityArchetype(text, productProfile, clusterInfo);
  const utilityType = inferUtilityType(text, productProfile, clusterInfo);
  const retailCommonalityScore = scoreRetailCommonality(text, productProfile, category);
  const rabbitHoleScore = scoreRabbitHole(text, productProfile, category);
  const visualClarityScore = scoreVisualClarity(text, productProfile, category);
  const savePotentialScore = scoreSavePotential({
    utilityType,
    ecosystemCluster,
    productProfile,
    category,
  });
  const amazonDiscoveryScore = scoreAmazonDiscovery({
    destinationUrl,
    productProfile,
    category,
    rabbitHoleScore,
  });
  const seasonalityScore = scoreSeasonality(text, productProfile, category, trigger);
  const landingPage = assessLandingPageMatch({
    destinationUrl,
    productProfile,
    text,
    category,
  });

  const discoveryScore = clampScore(
    rabbitHoleScore * 0.35 +
      savePotentialScore * 0.25 +
      visualClarityScore * 0.2 +
      amazonDiscoveryScore * 0.1 +
      (10 - retailCommonalityScore) * 0.1,
  );
  const productFitScore = clampScore(
    discoveryScore * 0.4 +
      landingPage.landing_page_match_score * 0.2 +
      savePotentialScore * 0.2 +
      visualClarityScore * 0.1 +
      (10 - retailCommonalityScore) * 0.1,
  );

  let productFitState = "downgraded";
  if (
    landingPage.landing_page_match_score <= 4 ||
    visualClarityScore <= 4 ||
    retailCommonalityScore >= 8 ||
    rabbitHoleScore <= 3
  ) {
    productFitState = "blocked";
  } else if (productFitScore >= PINTEREST_PRODUCT_FIT_RECOMMEND_THRESHOLD) {
    productFitState = "recommended";
  } else if (productFitScore >= 5) {
    productFitState = "acceptable";
  }

  const reasons = [
    `cluster:${ecosystemCluster}`,
    `identity:${identityArchetype}`,
    `utility:${utilityType}`,
    `rabbit_hole:${rabbitHoleScore}`,
    `retail_commonality:${retailCommonalityScore}`,
    `visual_clarity:${visualClarityScore}`,
    `save_potential:${savePotentialScore}`,
    `landing_page_match:${landingPage.landing_page_match_score}`,
  ];

  return {
    identity_archetype: identityArchetype,
    ecosystem_cluster: ecosystemCluster,
    future_self_signal: CLUSTER_RULES.find((rule) => rule.cluster === ecosystemCluster)?.futureSelf ||
      "wants the thing that feels useful and specific",
    save_reason: `Reusable ${utilityType.replace(/-/g, " ")} for ${ecosystemCluster}`,
    utility_type: utilityType,
    discovery_score: discoveryScore,
    retail_commonality_score: retailCommonalityScore,
    rabbit_hole_score: rabbitHoleScore,
    visual_clarity_score: visualClarityScore,
    save_potential_score: savePotentialScore,
    amazon_discovery_score: amazonDiscoveryScore,
    seasonality_score: seasonalityScore,
    landing_page_match_score: landingPage.landing_page_match_score,
    landing_page_match_reason: landingPage.landing_page_match_reason,
    product_fit_score: productFitScore,
    product_fit_state: productFitState,
    product_fit_reasons: reasons,
    product_fit_recommended: productFitState === "recommended",
    product_fit_blocked: productFitState === "blocked",
  };
}

function deriveSeasonality(text, productProfile) {
  const normalized = normalizeText(text);
  let holidayName = "";
  let urgencyLevel = "";
  let recommendedPostVolume = "";
  if (/mother|mom|mothers day/.test(normalized)) {
    holidayName = "Mother's Day";
    urgencyLevel = "high";
    recommendedPostVolume = "high";
  } else if (/father|dad|fathers day/.test(normalized)) {
    holidayName = "Father's Day";
    urgencyLevel = "high";
    recommendedPostVolume = "high";
  } else if (/christmas|holiday gift|gift guide/.test(normalized)) {
    holidayName = "Holiday season";
    urgencyLevel = "high";
    recommendedPostVolume = "high";
  } else if (/summer|pool|backyard|garden|patio|outdoor/.test(normalized)) {
    holidayName = "Summer";
    urgencyLevel = "medium";
    recommendedPostVolume = "medium";
  } else if (/halloween|spooky|fall/.test(normalized)) {
    holidayName = "Halloween";
    urgencyLevel = "medium";
    recommendedPostVolume = "medium";
  }

  if (!holidayName && productProfile?.id?.includes("goblin")) {
    holidayName = "Evergreen goblin lane";
    urgencyLevel = "evergreen";
    recommendedPostVolume = "steady";
  }

  return {
    holiday_name: holidayName,
    days_until_holiday: "",
    urgency_level: urgencyLevel,
    recommended_post_volume: recommendedPostVolume,
  };
}

function buildImagePromptVariants(visualStyle, productName, trigger) {
  const subject = productName || "the product";
  const mood = trigger || "the winning trigger";
  return {
    lifestyle: `${visualStyle || "lifestyle shot"}; real-life scene, ${subject}, focused on ${mood}, natural light, authentic context`,
    collage: `Pinterest collage with ${subject}, supporting props, layered composition, benefit labels, ${mood}, high click-through layout`,
    before_after: `Before-and-after composition for ${subject}, transformation-focused, clear contrast, ${mood}, vertical Pinterest framing`,
    ugc_style: `UGC handheld style featuring ${subject}, candid but polished, real use case, ${mood}, social proof feel`,
    product_spotlight: `Clean product spotlight of ${subject}, strong hero object, minimal clutter, ${mood}, commercial Pinterest aesthetic`,
  };
}

function buildSameProductVariants(trigger, productName, productType) {
  const hooks = buildHookVariants(trigger, productName, productType).slice(0, 3);
  const visuals = buildVisualVariants(trigger, productName, productType).slice(0, 3);
  const promptVariants = buildImagePromptVariants(visuals[0] || "", productName, trigger);
  const promptKeys = ["product_spotlight", "lifestyle", "before_after"];
  return hooks.map((hook, index) => ({
    hook,
    image_prompt: promptVariants[promptKeys[index % promptKeys.length]],
    visual_style: visuals[index] || visuals[0] || "",
  }));
}

function buildAdjacentAssetVariants(adjacentProducts, trigger, fallbackVisualStyle, productType) {
  return adjacentProducts.slice(0, 4).map((item) => {
    const promptVariants = buildImagePromptVariants(item.category || fallbackVisualStyle, item.product, trigger);
    return {
      product: item.product,
      hook: buildHookVariants(trigger, item.product, productType)[0] || item.product,
      image_prompt: promptVariants.collage,
      visual_style: item.category || fallbackVisualStyle || "",
    };
  });
}

const TRIGGER_TEMPLATES = {
  "peace/quiet": [
    "Buys you quiet time without a big setup",
    "Burns toddler energy fast",
    "The calmer version of summer fun",
    "Less chaos. More calm.",
  ],
  convenience: [
    "One small change with less hassle",
    "The easy version that still works",
    "Simple setup. Bigger payoff.",
    "Less friction, more use.",
  ],
  transformation: [
    "Before and after in one move",
    "The upgrade that changes the whole space",
    "A small swap with a big visual payoff",
    "This is the part that makes it feel finished.",
  ],
  productivity: [
    "Do more with less friction",
    "A faster path to the same result",
    "The shortcut that saves the most time",
    "Less busywork. More momentum.",
  ],
  humor: [
    "Goblin brain, but make it useful",
    "A little unhinged, surprisingly effective",
    "For the chaos goblin with taste",
    "Weird enough to stop the scroll.",
  ],
  "burnout relief": [
    "For the days you are running on fumes",
    "Permission to do less, not more",
    "A softer way through the week",
    "Tiny relief for a very tired brain.",
  ],
};

const VISUAL_STYLE_TEMPLATES = {
  "peace/quiet": [
    "lifestyle shot with a calm background",
    "wide shot showing the peaceful end result",
    "UGC-style action shot with real-life context",
    "soft before/after split with breathing room",
  ],
  convenience: [
    "product spotlight with a clean layout",
    "close-up detail shot with a simple headline",
    "collage showing the quick setup and result",
    "UGC handheld format with practical context",
  ],
  transformation: [
    "before/after split composition",
    "wide scene showing the finished space",
    "comparison layout with strong contrast",
    "collage format with the old vs new result",
  ],
  productivity: [
    "infographic-style layout with clear steps",
    "bold text overlay over a useful setup",
    "productivity dashboard inspired flat lay",
    "clean product shot with a benefit callout",
  ],
  humor: [
    "quote card with goblin-friendly attitude",
    "meme-adjacent collage layout",
    "UGC style with a playful messy edge",
    "bold typography over a character-driven scene",
  ],
  "burnout relief": [
    "soft lifestyle shot with a comforting palette",
    "quote format with breathing room",
    "quiet collage with a cozy mood",
    "gentle before/after showing relief and calm",
  ],
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function characterBigrams(value) {
  const normalized = normalizeText(value).replace(/\s+/g, "");
  const grams = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    grams.push(normalized.slice(index, index + 2));
  }
  return grams;
}

function overlapScore(listA, listB) {
  if (!listA.length || !listB.length) return 0;
  const setB = new Set(listB);
  let matches = 0;
  for (const item of listA) {
    if (setB.has(item)) matches += 1;
  }
  return (2 * matches) / (listA.length + listB.length);
}

function textSimilarity(left, right) {
  const tokenScore = overlapScore(tokenize(left), tokenize(right));
  const charScore = overlapScore(characterBigrams(left), characterBigrams(right));
  return Math.max(tokenScore, charScore);
}

function resolveLocalMediaPath(mediaPath) {
  if (!mediaPath) return null;
  const value = String(mediaPath);
  if (/^https?:\/\//i.test(value)) return value;
  if (path.isAbsolute(value)) return value;
  const workspacePath = path.join(BACKEND_ROOT, "..", value);
  if (fs.existsSync(workspacePath)) return workspacePath;
  return path.join(BACKEND_ROOT, value);
}

async function imageHash(filePath) {
  try {
    const { data } = await sharp(filePath)
      .resize(8, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = Array.from(data);
    const average = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;
    return pixels
      .map((pixel) => (pixel >= average ? "1" : "0"))
      .join("");
  } catch {
    return null;
  }
}

function hammingSimilarity(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 0;
  let distance = 0;
  for (let index = 0; index < hashA.length; index += 1) {
    if (hashA[index] !== hashB[index]) distance += 1;
  }
  return 1 - distance / hashA.length;
}

function platformListFromPost(post) {
  const targets = Array.isArray(post?.targets) ? post.targets : [];
  const platforms = Array.isArray(post?.platforms) ? post.platforms : [];
  return [
    ...platforms.map((platform) => String(platform || "").toLowerCase()),
    ...targets.map((target) => String(target?.platform || "").toLowerCase()),
  ].filter(Boolean);
}

function isPinterestEntry(post) {
  return platformListFromPost(post).includes("pinterest");
}

function timestampForEntry(post) {
  const value =
    post?.postedAt ||
    post?.processedAt ||
    post?.scheduledAt ||
    post?.updatedAt ||
    post?.createdAt ||
    post?.metadata?.postedAt ||
    post?.metadata?.processedAt ||
    null;
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

function inferTriggerFromText(text, productProfile) {
  const normalized = normalizeText(text);
  if (/quiet|calm|peace|safe|less noise|without a pool|sleep|soothe/.test(normalized)) {
    return "peace/quiet";
  }
  if (/easy|simple|hassle|convenience|setup|without.*work|shortcut|save time/.test(normalized)) {
    return "convenience";
  }
  if (/before after|transform|upgrade|glow up|changes everything|finished/.test(normalized)) {
    return "transformation";
  }
  if (/productivity|workflow|faster|time|friction|momentum|save you time/.test(normalized)) {
    return "productivity";
  }
  if (/goblin|chaos|weird|unhinged|funny|meme/.test(normalized)) {
    return "humor";
  }
  if (/burnout|tired|exhausted|recover|rest|fumes|overwhelmed|self care/.test(normalized)) {
    return "burnout relief";
  }
  if (productProfile?.category === "Devtools") return "productivity";
  if (productProfile?.id?.includes("goblin")) return "humor";
  if (productProfile?.category === "Physical products") return "peace/quiet";
  return "convenience";
}

function inferCategoryFromText(text, productProfile, trigger) {
  const normalized = normalizeText(text);
  if (/amazon|backyard|garden|patio|pathway|landscape|outdoor|home\s+spa/.test(normalized)) {
    return /season|summer|backyard|garden|patio|landscape|outdoor/.test(normalized)
      ? "home/garden affiliate"
      : "seasonal affiliate";
  }
  if (productProfile?.category === "Devtools" || /devtool|workflow|automation|prompt|productivity/.test(normalized)) {
    return "dev products";
  }
  if (/goblin|affirmation|printable/.test(normalized) || productProfile?.id?.includes("goblin")) {
    return "goblin printables";
  }
  if (/coloring|coloring book/.test(normalized) || productProfile?.id?.includes("coloring")) {
    return "coloring books";
  }
  if (trigger === "productivity") return "dev products";
  if (trigger === "humor" || trigger === "burnout relief") return "goblin printables";
  return productProfile?.category === "Physical products" ? "seasonal affiliate" : "dev products";
}

function inferDestinationUrl(raw, productProfile) {
  return (
    raw?.destination_url ||
    raw?.link?.primary ||
    raw?.link?.amazon ||
    raw?.link?.gumroad ||
    productProfile?.links?.primary ||
    productProfile?.links?.amazon ||
    productProfile?.links?.gumroad ||
    ""
  );
}

function deriveIntentMetadata({ trigger, category, productProfile, input = {}, raw = {} }) {
  const audience = String(input.audience || productProfile?.audience || "").trim();
  const identityTags = Array.from(
    new Set(
      [
        ...tokenize(audience).slice(0, 3),
        productProfile?.category === "Devtools" ? "developer" : "",
        productProfile?.category === "Physical products" ? "maker" : "",
        String(productProfile?.id || "").includes("goblin") ? "goblin brain" : "",
        /garden|outdoor|home\/garden/i.test(category) ? "home gardener" : "",
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 4);
  const emotionTagsByTrigger = {
    "peace/quiet": ["calm", "relief", "breathing-room"],
    convenience: ["ease", "clarity", "less-friction"],
    transformation: ["anticipation", "hope", "contrast"],
    productivity: ["control", "focus", "momentum"],
    humor: ["playful", "quirky", "scroll-stopping"],
    "burnout relief": ["relief", "softness", "rest"],
  };
  const intentPrimary =
    raw.intent_primary ||
    (trigger === "productivity" || trigger === "burnout relief"
      ? "problem"
      : trigger === "transformation"
        ? "aesthetic"
        : trigger === "humor"
          ? "identity"
          : "lifestyle");
  const intentSecondary =
    raw.intent_secondary ||
    (trigger === "productivity"
      ? "solution"
      : trigger === "peace/quiet"
        ? "aspiration"
        : trigger === "transformation"
          ? "inspiration"
          : "evaluation");
  const awarenessStage =
    raw.awareness_stage ||
    (trigger === "productivity" || trigger === "burnout relief"
      ? "problem-aware"
      : trigger === "transformation"
        ? "inspiration"
        : "evaluation");
  const painProximity = Number.isFinite(Number(raw.pain_proximity))
    ? Number(raw.pain_proximity)
    : trigger === "burnout relief"
      ? 9
      : trigger === "productivity"
        ? 8
        : trigger === "convenience"
          ? 5
          : 4;
  const commercialityScore = Number.isFinite(Number(raw.commerciality_score))
    ? Number(raw.commerciality_score)
    : category === "dev products"
      ? 8
      : category === "seasonal affiliate" || category === "home/garden affiliate"
        ? 7
        : 5;
  const queryChainDepth = Number.isFinite(Number(raw.query_chain_depth))
    ? Number(raw.query_chain_depth)
    : category === "dev products"
      ? 4
      : 3;
  const evergreenScore = Number.isFinite(Number(raw.evergreen_score))
    ? Number(raw.evergreen_score)
    : category === "dev products"
      ? 9
      : 7;

  return {
    intent_primary: intentPrimary,
    intent_secondary: intentSecondary,
    awareness_stage: awarenessStage,
    pain_proximity: painProximity,
    commerciality_score: commercialityScore,
    emotion_tags: Array.isArray(raw.emotion_tags) && raw.emotion_tags.length > 0 ? raw.emotion_tags : emotionTagsByTrigger[trigger] || ["clarity"],
    identity_tags: Array.isArray(raw.identity_tags) && raw.identity_tags.length > 0 ? raw.identity_tags : identityTags,
    query_chain_depth: queryChainDepth,
    evergreen_score: evergreenScore,
    jtbd:
      raw.jtbd ||
      `Help ${audience || "the audience"} move from ${intentPrimary} toward ${intentSecondary || "clarity"}`.trim(),
    pin_angle: raw.pin_angle || trigger || category || "general",
  };
}

function buildHookVariants(trigger, productName = "", productType = "") {
  const base = `${productName || productType || "This pin"}`.trim();
  const templates = TRIGGER_TEMPLATES[trigger] || TRIGGER_TEMPLATES.convenience;
  return templates.map((template) => `${template}${base ? ` - ${base}` : ""}`.trim());
}

function buildVisualVariants(trigger, productName = "", productType = "") {
  const base = `${productName || productType || "the product"}`.trim();
  const templates = VISUAL_STYLE_TEMPLATES[trigger] || VISUAL_STYLE_TEMPLATES.convenience;
  return templates.map((template) => `${template} featuring ${base}`.trim());
}

function recentCountsByCategory(history = [], withinMs = PINTEREST_CATEGORY_WINDOW_MS) {
  const now = Date.now();
  const counts = new Map();
  for (const entry of history) {
    const age = now - (entry.timestamp || 0);
    if (age > withinMs) continue;
    const key = String(entry.category || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function buildCreativeHistoryItem(post) {
  const title = String(post?.title || post?.hook || post?.product || "").trim();
  const body = String(post?.body || post?.description || "").trim();
  const visualStyle = String(post?.visual_style || post?.image_concept || post?.visual_hook || post?.image_prompt || "").trim();
  const mediaPath = resolveLocalMediaPath(post?.mediaPath || post?.image || "");
  return {
    id: post?.id || null,
    title,
    body,
    hook: String(post?.hook || title).trim(),
    visualStyle,
    mediaPath,
    mediaHash: null,
    trigger: String(post?.psychological_trigger || "").trim(),
    category: String(post?.category || "").trim(),
    destinationUrl: String(post?.destination_url || post?.link?.primary || post?.link?.amazon || post?.link?.gumroad || "").trim(),
    intentPrimary: String(post?.metadata?.intentPrimary || post?.metadata?.intent_primary || "").trim(),
    intentSecondary: String(post?.metadata?.intentSecondary || post?.metadata?.intent_secondary || "").trim(),
    awarenessStage: String(post?.metadata?.awarenessStage || post?.metadata?.awareness_stage || "").trim(),
    pinAngle: String(post?.metadata?.pinAngle || post?.metadata?.pin_angle || "").trim(),
    ecosystemCluster: String(post?.metadata?.ecosystemCluster || post?.metadata?.ecosystem_cluster || "").trim(),
    identityArchetype: String(post?.metadata?.identityArchetype || post?.metadata?.identity_archetype || "").trim(),
    productFitState: String(post?.metadata?.productFitState || post?.metadata?.product_fit_state || "").trim(),
    timestamp: timestampForEntry(post),
  };
}

function scoreAgainstHistory(candidate, history = []) {
  let hookSimilarity = 0;
  let visualSimilarity = 0;
  let mediaSimilarity = 0;
  for (const entry of history) {
    hookSimilarity = Math.max(
      hookSimilarity,
      textSimilarity(candidate.hook, entry.hook || entry.title || entry.body),
    );
    visualSimilarity = Math.max(
      visualSimilarity,
      textSimilarity(candidate.visualStyle, entry.visualStyle || entry.body || entry.title),
    );
    if (candidate.mediaHash && entry.mediaHash) {
      mediaSimilarity = Math.max(mediaSimilarity, hammingSimilarity(candidate.mediaHash, entry.mediaHash));
    }
  }
  return { hookSimilarity, visualSimilarity: Math.max(visualSimilarity, mediaSimilarity) };
}

function pickDifferentTemplate(values, recentValues = []) {
  const normalizedRecent = new Set(recentValues.map((value) => normalizeText(value)));
  return values.find((value) => !normalizedRecent.has(normalizeText(value))) || values[0] || "";
}

function rewriteHook({ trigger, productName, productType, recentHooks = [] }) {
  const variants = buildHookVariants(trigger, productName, productType);
  return pickDifferentTemplate(variants, recentHooks);
}

function rewriteVisualStyle({ trigger, productName, productType, recentVisuals = [] }) {
  const variants = buildVisualVariants(trigger, productName, productType);
  return pickDifferentTemplate(variants, recentVisuals);
}

function buildAdjacentProducts(productProfile, trigger) {
  const familyMap = {
    productivity: ["Devtools", "Digital products"],
    "peace/quiet": ["Physical products", "Digital products"],
    convenience: ["Physical products", "Digital products"],
    transformation: ["Physical products", "Digital products"],
    humor: ["Digital products", "Physical products"],
    "burnout relief": ["Digital products", "Physical products"],
  };
  const allowedCategories = familyMap[trigger] || [];
  return productProfiles
    .filter((profile) => profile.id !== productProfile?.id)
    .filter((profile) => !allowedCategories.length || allowedCategories.includes(profile.category))
    .slice(0, 3)
    .map((profile) => ({
      product: profile.label,
      category: profile.category,
      destination_url: profile.links?.primary || profile.links?.amazon || profile.links?.gumroad || "",
    }));
}

function candidateMatchesPinterest(input = {}) {
  const platformIds = Array.isArray(input.platformIds)
    ? input.platformIds.map((platform) => String(platform || "").toLowerCase())
    : Array.isArray(input.platforms)
      ? input.platforms.map((platform) => String(platform || "").toLowerCase())
      : Array.isArray(input.targets)
        ? input.targets.map((target) => String(target?.platform || "").toLowerCase())
        : [];
  const productProfile = getProductProfile(input.productProfileId);
  return platformIds.includes("pinterest") || Boolean(productProfile?.promotionChannels?.includes("pinterest"));
}

export async function buildPinterestCreativeContext(input = {}) {
  if (!candidateMatchesPinterest(input)) return null;

  const [posts, postedLog] = await Promise.all([listPosts(), listPostedLog()]);
  const combined = [...(postedLog || []), ...(posts || [])]
    .filter(isPinterestEntry)
    .sort((a, b) => timestampForEntry(b) - timestampForEntry(a))
    .slice(0, PINTEREST_LOOKBACK_LIMIT)
    .map(buildCreativeHistoryItem);

  for (const item of combined) {
    if (item.mediaPath && fs.existsSync(item.mediaPath)) {
      item.mediaHash = await imageHash(item.mediaPath);
    }
  }

  const productProfile = getProductProfile(input.productProfileId);
  const seedText = [input.productName, input.productType, input.audience, productProfile?.brandVoice]
    .filter(Boolean)
    .join(" ");
  const trigger = inferTriggerFromText(seedText, productProfile);
  const category = inferCategoryFromText(seedText, productProfile, trigger);
  const productFit = assessPinterestProductFit({
    text: seedText,
    destinationUrl:
      input.destinationUrl ||
      productProfile?.links?.primary ||
      productProfile?.links?.amazon ||
      productProfile?.links?.gumroad ||
      "",
    productProfile,
    trigger,
    category,
  });
  const categoryCounts = recentCountsByCategory(combined);
  const categoryThrottleCount = categoryCounts.get(category) || 0;

  return {
    enabled: true,
    trigger,
    category,
    categoryThrottleCount,
    categoryThrottleHit: categoryThrottleCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT,
    productFit,
    productFitState: productFit.product_fit_state,
    productFitBlocked: productFit.product_fit_blocked,
    productFitRecommended: productFit.product_fit_recommended,
    recentHooks: combined.slice(0, 10).map((entry) => entry.hook || entry.title || "").filter(Boolean),
    recentVisuals: combined
      .slice(0, 10)
      .map((entry) => entry.visualStyle || entry.body || entry.title || "")
      .filter(Boolean),
    recentHistory: combined,
    priorityLanes: PRIORITY_LANES,
  };
}

export function enrichPinterestCreativeResult(raw = {}, input = {}, context = null) {
  const productProfile = getProductProfile(input.productProfileId);
  const isPinterestRelevant = Boolean(context?.enabled) || candidateMatchesPinterest(input);
  const destinationUrl = inferDestinationUrl(raw, productProfile);
  const trigger =
    raw.psychological_trigger ||
    context?.trigger ||
    inferTriggerFromText([raw.product, raw.hook, raw.visual_style, raw.image_concept, input.productName, input.productType].filter(Boolean).join(" "), productProfile);
  const category =
    raw.category ||
    context?.category ||
    inferCategoryFromText([raw.product, raw.hook, raw.visual_style, raw.image_concept, input.productName, input.productType].filter(Boolean).join(" "), productProfile, trigger);
  const intentMetadata = deriveIntentMetadata({
    trigger,
    category,
    productProfile,
    input,
    raw,
  });
  const fitAssessment =
    context?.productFit ||
    assessPinterestProductFit({
      text: [raw.product, raw.hook, raw.visual_style, raw.image_concept, input.productName, input.productType]
        .filter(Boolean)
        .join(" "),
      destinationUrl,
      productProfile,
      trigger,
      category,
    });
  const recentHistory = Array.isArray(context?.recentHistory) ? context.recentHistory : [];
  const hookCandidates = [
    raw.hook,
    raw.title,
    raw.hook_options?.[0],
    raw.platform_variants?.Pinterest?.hook,
    raw.meta_description,
    input.productName,
  ].filter(Boolean);
  const visualCandidates = [
    raw.visual_style,
    raw.image_concept,
    raw.visual_hook,
    raw.image_prompt,
    raw.platform_variants?.Pinterest?.body,
    input.productType,
  ].filter(Boolean);

  let hook = String(hookCandidates[0] || input.productName || "").trim();
  let visualStyle = String(visualCandidates[0] || input.productType || "").trim();

  const scored = scoreAgainstHistory({ hook, visualStyle, mediaHash: null }, recentHistory);
  const categoryThrottleCount = context?.categoryThrottleCount || 0;
  const hookSimilarity = scored.hookSimilarity;
  const visualSimilarity = scored.visualSimilarity;

  const recentHookValues = recentHistory.map((entry) => entry.hook || entry.title || entry.body || "").filter(Boolean);
  const recentVisualValues = recentHistory.map((entry) => entry.visualStyle || entry.body || entry.title || "").filter(Boolean);

  let confidenceScore = Number(raw.confidence_score) || 0;
  if (isPinterestRelevant) {
    if (hookSimilarity > 0.75 || categoryThrottleCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT) {
      hook = rewriteHook({
        trigger,
        productName: input.productName,
        productType: input.productType,
        recentHooks: recentHookValues,
      });
    }

    if (visualSimilarity > 0.8 || categoryThrottleCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT) {
      visualStyle = rewriteVisualStyle({
        trigger,
        productName: input.productName,
        productType: input.productType,
        recentVisuals: recentVisualValues,
      });
    }

    const laneFit =
      category === "dev products" && productProfile?.category === "Devtools"
        ? 12
        : category === "goblin printables" && String(productProfile?.id || "").includes("goblin")
          ? 10
          : category === "coloring books" && /coloring/i.test(`${productProfile?.productType || ""} ${input.productType || ""}`)
            ? 10
        : category === "home/garden affiliate" || category === "seasonal affiliate"
          ? 8
          : 0;
    const similarityPenalty = Math.round(Math.max(hookSimilarity, visualSimilarity) * 30);
    const throttlePenalty = categoryThrottleCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT ? 18 : 0;
    const fitBonus = fitAssessment.product_fit_state === "recommended"
      ? 8
      : fitAssessment.product_fit_state === "acceptable"
        ? 3
        : fitAssessment.product_fit_state === "blocked"
          ? -18
          : 0;
    confidenceScore = Math.max(
      20,
      Math.min(
        99,
        82 +
          laneFit +
          fitBonus -
          similarityPenalty -
          throttlePenalty -
          Math.max(0, fitAssessment.retail_commonality_score - 6),
      ),
    );
  }

  const adjacentProducts = buildAdjacentProducts(productProfile, trigger);
  const imagePromptVariants = buildImagePromptVariants(
    visualStyle,
    raw.product || input.productName || productProfile?.label || "",
    trigger,
  );
  const sameProductVariants = buildSameProductVariants(
    trigger,
    raw.product || input.productName || productProfile?.label || "",
    input.productType,
  );
  const winnerExpansion = {
    adjacent_variations: adjacentProducts.slice(0, 3).map((item) => ({
      same_emotion: trigger,
      different_product: item.product,
      category: item.category,
      destination_url: item.destination_url,
    })),
    hook_variations: buildHookVariants(trigger, input.productName, input.productType).slice(0, 2),
    experimental_variation: pickDifferentTemplate(
      [
        "before/after collage",
        "lifestyle UGC shot",
        "bold text overlay",
        "infographic card",
        "quote format",
      ],
      [visualStyle],
    ),
  };
  const seasonality = deriveSeasonality(
    [raw.product, raw.hook, raw.visual_style, input.productName, input.productType].filter(Boolean).join(" "),
    productProfile,
  );
  const repurposing =
    String(productProfile?.id || "").includes("goblin") || trigger === "humor"
      ? {
          meme_pin: imagePromptVariants.ugc_style,
          line_art_prompt: `Black and white line art of ${raw.product || input.productName || productProfile?.label || "a goblin"}, printable coloring page, clean outlines, white background, Amazon KDP friendly`,
          printable_pack: `Printable goblin pack focused on ${trigger}, vertical cover art and interior pages, Amazon-ready`,
          amazon_book_bucket: `Amazon bucket: goblin humor, goblin affirmations, goblin coloring pages`,
        }
      : {
          meme_pin: "",
          line_art_prompt: "",
          printable_pack: "",
          amazon_book_bucket: "",
        };

  return {
    ...raw,
    product: raw.product || input.productName || productProfile?.label || "",
    psychological_trigger: raw.psychological_trigger || trigger,
    hook,
    visual_style: visualStyle,
    category,
    destination_url: destinationUrl,
    confidence_score: confidenceScore,
    ...intentMetadata,
    ...fitAssessment,
    image_similarity_score: Math.round(visualSimilarity * 100),
    hook_similarity_score: Math.round(hookSimilarity * 100),
    category_throttle_count: categoryThrottleCount,
    category_throttle_hit: categoryThrottleCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT,
    winning_trigger_lane: trigger,
    lane_priority: raw.lane_priority || LANE_PRIORITY,
    seasonality: raw.seasonality || seasonality,
    image_prompt_variants: raw.image_prompt_variants || imagePromptVariants,
    ip_repurposing: raw.ip_repurposing || repurposing,
    asset_expansion: raw.asset_expansion || {
      recommended_image_count: 3,
      max_image_count: 4,
      adjacent_products: buildAdjacentAssetVariants(adjacentProducts, trigger, visualStyle, input.productType),
      same_product_variants: sameProductVariants.slice(0, 4),
      stop_generation_threshold: {
        same_hook_limit: 3,
        same_visual_limit: 3,
        same_product_limit: 4,
      },
    },
    creative_strategy: isPinterestRelevant
      ? fitAssessment.product_fit_blocked
        ? "Downgrade this lane: the product looks too generic or poorly matched for Pinterest discovery. Rewrite the angle or move it to another platform."
        : fitAssessment.product_fit_recommended
          ? "Repeat the trigger, not the visual. Rotate product, angle, and format before reusing a creative lane."
          : "The product can work, but it needs sharper identity, stronger utility framing, and a clearer landing-page match."
      : "",
    winner_expansion: winnerExpansion,
  };
}

export async function findPinterestCreativeConflict(posts = [], candidate = {}) {
  if (!candidateMatchesPinterest(candidate)) return null;

  const productProfile = getProductProfile(candidate.productProfileId);
  const recentHistory = (Array.isArray(posts) ? posts : [])
    .filter(isPinterestEntry)
    .sort((a, b) => timestampForEntry(b) - timestampForEntry(a))
    .slice(0, PINTEREST_LOOKBACK_LIMIT)
    .map(buildCreativeHistoryItem);

  for (const item of recentHistory) {
    if (item.mediaPath && fs.existsSync(item.mediaPath)) {
      item.mediaHash = await imageHash(item.mediaPath);
    }
  }

  let candidateMediaHash = null;
  const candidateMediaPath = resolveLocalMediaPath(candidate.mediaPath || candidate.image || "");
  if (candidateMediaPath && fs.existsSync(candidateMediaPath)) {
    candidateMediaHash = await imageHash(candidateMediaPath);
  }

  const enriched = enrichPinterestCreativeResult(candidate, {
    productName: candidate.title || candidate.product || candidate.metadata?.productName || "",
    productType: candidate.metadata?.productType || candidate.body || "",
    audience: candidate.metadata?.audience || "",
    productProfileId: candidate.productProfileId,
  }, {
    enabled: true,
    trigger: inferTriggerFromText([candidate.title, candidate.body, productProfile?.brandVoice].filter(Boolean).join(" "), productProfile),
    category: inferCategoryFromText([candidate.title, candidate.body, productProfile?.brandVoice].filter(Boolean).join(" "), productProfile, inferTriggerFromText([candidate.title, candidate.body, productProfile?.brandVoice].filter(Boolean).join(" "), productProfile)),
    categoryThrottleCount: recentCountsByCategory(recentHistory).get(
      inferCategoryFromText([candidate.title, candidate.body, productProfile?.brandVoice].filter(Boolean).join(" "), productProfile, inferTriggerFromText([candidate.title, candidate.body, productProfile?.brandVoice].filter(Boolean).join(" "), productProfile)),
    ) || 0,
    recentHistory,
  });

  const hookSimilarity = enriched.hook_similarity_score / 100;
  let visualSimilarity = enriched.image_similarity_score / 100;
  if (candidateMediaHash) {
    for (const entry of recentHistory) {
      if (!entry.mediaHash) continue;
      visualSimilarity = Math.max(visualSimilarity, hammingSimilarity(candidateMediaHash, entry.mediaHash));
    }
  }
  const sameCategoryCount = enriched.category_throttle_count || 0;

  if (hookSimilarity > 0.75 || visualSimilarity > 0.8 || sameCategoryCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT) {
    const closest = recentHistory.find((entry) => {
      const hookMatch = textSimilarity(enriched.hook, entry.hook || entry.title || entry.body) > 0.75;
      const visualMatch = textSimilarity(enriched.visual_style, entry.visualStyle || entry.body || entry.title) > 0.8;
      return hookMatch || visualMatch;
    });
    return {
      reason: sameCategoryCount >= PINTEREST_CATEGORY_THROTTLE_LIMIT ? "category_throttle" : "creative_similarity",
      category: enriched.category,
      hookSimilarity: enriched.hook_similarity_score,
      visualSimilarity: enriched.image_similarity_score,
      matchedPostId: closest?.id || null,
      matchedTitle: closest?.title || closest?.hook || null,
      suggestedHook: enriched.hook,
      suggestedVisualStyle: enriched.visual_style,
      suggestion: enriched,
    };
  }

  return null;
}
