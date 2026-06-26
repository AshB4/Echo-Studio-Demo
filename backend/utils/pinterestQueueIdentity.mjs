import path from "path";

function slugify(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function basenameLower(value = "") {
  return path.basename(String(value || "")).toLowerCase();
}

function normalizedPath(value = "") {
  return String(value || "").replace(/\\/g, "/").toLowerCase();
}

function normalizedText(parts = []) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .map((part) => String(part || "").toLowerCase())
    .join(" ");
}

function toTextArray(value) {
  if (value === null || value === undefined) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => (Array.isArray(item) ? item : [item]))
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export function inferStartAnywayIdentity(text = "", mediaPath = "") {
  const media = basenameLower(mediaPath);
  const fullMedia = String(mediaPath || "").toLowerCase();
  const source = `${text} ${media} ${fullMedia}`;
  if (!/start-anyway|frog circle shirt|frog shirt|frog hoodie/.test(source)) {
    return null;
  }
  if (/hoodie|cozy outfit|hoodie aesthetic|hdke-y7dfd6oe9-4yglo8ycwbu/.test(source)) {
    return {
      productProfileId: "start-anyway-frog-hoodie",
      batchLabel: "start-anyway-frog",
    };
  }
  return {
    productProfileId: "start-anyway-frog-tee",
    batchLabel: "start-anyway-frog",
  };
}

function inferKnownIdentity(text, mediaPath = "") {
  const media = basenameLower(mediaPath);
  const fullMedia = normalizedPath(mediaPath);
  const source = `${text} ${media} ${fullMedia}`;

  if (/olaplex|bond repair|damaged hair|hair repair|hair breakage/.test(source)) {
    return {
      productProfileId: "amazon-beauty-olaplex",
      batchLabel: "olaplex-gap-fill-25",
    };
  }
  if (/laneige|laniege|lip sleeping mask|lip mask|dry lips|lip balm|lip landmark|last lip kit|lip kit/.test(source)) {
    return {
      productProfileId: "amazon-beauty-laneige-lip-mask",
      batchLabel: "laneige-lipmask-25pins-may",
    };
  }
  if (/password logbook|password book|password organizer|password notebook|password keeper|passwordbook/.test(source)) {
    return {
      productProfileId: "amazon-password-logbook",
      batchLabel: "vintage-password-logbook-mothersday-evergreen",
    };
  }
  if (/gel nail|manicure|nail color|nail kit|polish set|beetle.*nail|nails at home/.test(source)) {
    return {
      productProfileId: "amazon-beauty-gel-nails",
      batchLabel: "gel-nails-april",
    };
  }
  if (/kawaii halloween|spooky cute|pastel goth|cute spooky|halloween coloring|kawaiihalloween/.test(source)) {
    return {
      productProfileId: "kawaii-halloween-evergreen",
      batchLabel: "kawaii-halloween-evergreen",
    };
  }
  if (/passover|seder|matzah/.test(source)) {
    return {
      productProfileId: "passover-seder-survival-kit",
      batchLabel: "passover-seder-survival-kit-pinterest",
    };
  }
  if (/prompt storm|prompt-storm|100prompt-storm|prompt pack|creator reset/.test(source)) {
    return {
      productProfileId: "prompt-storm",
      batchLabel: "prompt-storm-pinterest",
    };
  }
  if (fullMedia.includes("frontend/assets/spring2026/sewing/")) {
    if (/victoriansewingkit|itemsinvictoriansewingkit/.test(media)) {
      return {
        productProfileId: "amazon-victorian-sewing-kit",
        batchLabel: "spring2026-sewing",
      };
    }
    if (/metalbobbinswithsewingmachine|bobbinsmetal/.test(media)) {
      return {
        productProfileId: "amazon-sewing-metal-bobbins",
        batchLabel: "spring2026-sewing",
      };
    }
    if (/aluminumbobbin/.test(media)) {
      return {
        productProfileId: "amazon-sewing-aluminum-bobbins",
        batchLabel: "spring2026-sewing",
      };
    }
    if (/plasticbobbinmachine|2plasticbobbins|plasticbobbinthredon/.test(media)) {
      return {
        productProfileId: "amazon-sewing-plastic-bobbins",
        batchLabel: "spring2026-sewing",
      };
    }
  }
  if (/bubble mower|splash pad|splashez|water play|gardening toy|kids gardening|backyard toy|toddler/.test(source)) {
    return {
      productProfileId: "amazon-kids-backyard-play",
      batchLabel: "gardening-and-splash-mix",
    };
  }
  const startAnyway = inferStartAnywayIdentity(text, mediaPath);
  if (startAnyway) return startAnyway;
  if (fullMedia.includes("frontend/assets/goblinaffs/goblintees/shirtmemes/")) {
    if (/baby/.test(media)) {
      return {
        productProfileId: "goblin-certified-baby",
        batchLabel: "goblin-tees",
      };
    }
    if (/kid|kids/.test(media)) {
      return {
        productProfileId: "goblin-certified-kids",
        batchLabel: "goblin-tees",
      };
    }
    return {
      productProfileId: "goblin-dark-tees",
      batchLabel: "goblin-tees",
    };
  }
  if (fullMedia.includes("frontend/assets/goblinaffs/goblintees/")) {
    if (/onesie|baby/.test(media)) {
      return {
        productProfileId: "goblin-certified-baby",
        batchLabel: "goblin-tees",
      };
    }
    if (/kid/.test(media)) {
      return {
        productProfileId: "goblin-certified-kids",
        batchLabel: "goblin-tees",
      };
    }
    if (/tank/.test(media)) {
      return {
        productProfileId: "goblin-tanks",
        batchLabel: "goblin-tees",
      };
    }
    if (/sweatshirt/.test(media)) {
      return {
        productProfileId: "goblin-sweatshirts",
        batchLabel: "goblin-tees",
      };
    }
    if (/hoodie|magentacll|dgraycll|brownhoodie/.test(media)) {
      return {
        productProfileId: "goblin-hoodies",
        batchLabel: "goblin-tees",
      };
    }
    if (/tee|graycll|blackcll|redcll/.test(media)) {
      if (/black|gray|red/.test(media)) {
        return {
          productProfileId: "goblin-dark-tees",
          batchLabel: "goblin-tees",
        };
      }
      return {
        productProfileId: "goblin-light-tees",
        batchLabel: "goblin-tees",
      };
    }
  }
  if (fullMedia.includes("frontend/assets/goblinaffs/goblinmemes/")) {
    return {
      productProfileId: "goblin-memes",
      batchLabel: "goblin-memes",
    };
  }
  if (/goblin|anti productivity|side quest|hot mess|doing less|move slowly|goblinaff/.test(source)) {
    return {
      productProfileId: "goblin-coloring-affirmations",
      batchLabel: "goblin-restored-mix",
    };
  }
  return null;
}

export function inferPinterestQueueIdentity(input = {}, options = {}) {
  const metadata = input?.metadata || {};
  const explicitProductId = String(
    metadata?.productProfileId || input?.productProfileId || "",
  ).trim();
  const explicitBatchLabel = String(
    metadata?.batchLabel || options?.batchLabel || input?.batchLabel || "",
  ).trim();
  const mediaPath = String(input?.mediaPath || input?.image || options?.image || "").trim();

  const identityText = normalizedText([
    input?.title,
    input?.description,
    input?.body,
    metadata?.keyword,
    options?.keyword,
    metadata?.angle,
    options?.angle,
    metadata?.cluster,
    options?.cluster,
    metadata?.productLink,
    options?.productLink,
    metadata?.pinterestTags,
    options?.tags,
  ]);

  const known = inferKnownIdentity(identityText, mediaPath);

  const productProfileId =
    explicitProductId && explicitProductId !== "restored-batch" && explicitProductId !== "unknown"
      ? explicitProductId
      : known?.productProfileId || slugify(explicitBatchLabel) || slugify(options?.campaign) || null;

  const batchLabel =
    explicitBatchLabel || known?.batchLabel || slugify(options?.campaign) || slugify(options?.batchFile) || null;

  const intentPrimary = String(
    metadata?.intentPrimary || metadata?.intent_primary || input?.intentPrimary || "",
  ).trim();
  const intentSecondary = String(
    metadata?.intentSecondary || metadata?.intent_secondary || input?.intentSecondary || "",
  ).trim();
  const awarenessStage = String(
    metadata?.awarenessStage || metadata?.awareness_stage || input?.awarenessStage || "",
  ).trim();
  const painProximity = Number.isFinite(Number(metadata?.painProximity ?? metadata?.pain_proximity ?? input?.painProximity))
    ? Number(metadata?.painProximity ?? metadata?.pain_proximity ?? input?.painProximity)
    : null;
  const commercialityScore = Number.isFinite(
    Number(metadata?.commercialityScore ?? metadata?.commerciality_score ?? input?.commercialityScore),
  )
    ? Number(metadata?.commercialityScore ?? metadata?.commerciality_score ?? input?.commercialityScore)
    : null;
  const emotionTags = toTextArray(
    metadata?.emotionTags || metadata?.emotion_tags || input?.emotionTags || input?.emotion_tags,
  );
  const identityTags = toTextArray(
    metadata?.identityTags || metadata?.identity_tags || input?.identityTags || input?.identity_tags,
  );
  const queryChainDepth = Number.isFinite(
    Number(metadata?.queryChainDepth ?? metadata?.query_chain_depth ?? input?.queryChainDepth),
  )
    ? Number(metadata?.queryChainDepth ?? metadata?.query_chain_depth ?? input?.queryChainDepth)
    : null;
  const evergreenScore = Number.isFinite(
    Number(metadata?.evergreenScore ?? metadata?.evergreen_score ?? input?.evergreenScore),
  )
    ? Number(metadata?.evergreenScore ?? metadata?.evergreen_score ?? input?.evergreenScore)
    : null;
  const jtbd = String(metadata?.jtbd || input?.jtbd || "").trim();
  const pinAngle = String(metadata?.pinAngle || metadata?.pin_angle || input?.pinAngle || "").trim();
  const identityArchetype = String(
    metadata?.identityArchetype || metadata?.identity_archetype || input?.identityArchetype || "",
  ).trim();
  const ecosystemCluster = String(
    metadata?.ecosystemCluster || metadata?.ecosystem_cluster || input?.ecosystemCluster || "",
  ).trim();
  const futureSelfSignal = String(
    metadata?.futureSelfSignal || metadata?.future_self_signal || input?.futureSelfSignal || "",
  ).trim();
  const saveReason = String(metadata?.saveReason || metadata?.save_reason || input?.saveReason || "").trim();
  const utilityType = String(
    metadata?.utilityType || metadata?.utility_type || input?.utilityType || "",
  ).trim();
  const discoveryScore = Number.isFinite(
    Number(metadata?.discoveryScore ?? metadata?.discovery_score ?? input?.discoveryScore),
  )
    ? Number(metadata?.discoveryScore ?? metadata?.discovery_score ?? input?.discoveryScore)
    : null;
  const retailCommonalityScore = Number.isFinite(
    Number(metadata?.retailCommonalityScore ?? metadata?.retail_commonality_score ?? input?.retailCommonalityScore),
  )
    ? Number(metadata?.retailCommonalityScore ?? metadata?.retail_commonality_score ?? input?.retailCommonalityScore)
    : null;
  const rabbitHoleScore = Number.isFinite(
    Number(metadata?.rabbitHoleScore ?? metadata?.rabbit_hole_score ?? input?.rabbitHoleScore),
  )
    ? Number(metadata?.rabbitHoleScore ?? metadata?.rabbit_hole_score ?? input?.rabbitHoleScore)
    : null;
  const visualClarityScore = Number.isFinite(
    Number(metadata?.visualClarityScore ?? metadata?.visual_clarity_score ?? input?.visualClarityScore),
  )
    ? Number(metadata?.visualClarityScore ?? metadata?.visual_clarity_score ?? input?.visualClarityScore)
    : null;
  const savePotentialScore = Number.isFinite(
    Number(metadata?.savePotentialScore ?? metadata?.save_potential_score ?? input?.savePotentialScore),
  )
    ? Number(metadata?.savePotentialScore ?? metadata?.save_potential_score ?? input?.savePotentialScore)
    : null;
  const amazonDiscoveryScore = Number.isFinite(
    Number(metadata?.amazonDiscoveryScore ?? metadata?.amazon_discovery_score ?? input?.amazonDiscoveryScore),
  )
    ? Number(metadata?.amazonDiscoveryScore ?? metadata?.amazon_discovery_score ?? input?.amazonDiscoveryScore)
    : null;
  const seasonalityScore = Number.isFinite(
    Number(metadata?.seasonalityScore ?? metadata?.seasonality_score ?? input?.seasonalityScore),
  )
    ? Number(metadata?.seasonalityScore ?? metadata?.seasonality_score ?? input?.seasonalityScore)
    : null;
  const landingPageMatchScore = Number.isFinite(
    Number(metadata?.landingPageMatchScore ?? metadata?.landing_page_match_score ?? input?.landingPageMatchScore),
  )
    ? Number(metadata?.landingPageMatchScore ?? metadata?.landing_page_match_score ?? input?.landingPageMatchScore)
    : null;
  const landingPageMatchReason = String(
    metadata?.landingPageMatchReason || metadata?.landing_page_match_reason || input?.landingPageMatchReason || "",
  ).trim();
  const productFitScore = Number.isFinite(
    Number(metadata?.productFitScore ?? metadata?.product_fit_score ?? input?.productFitScore),
  )
    ? Number(metadata?.productFitScore ?? metadata?.product_fit_score ?? input?.productFitScore)
    : null;
  const productFitState = String(
    metadata?.productFitState || metadata?.product_fit_state || input?.productFitState || "",
  ).trim();
  const productFitReasons = toTextArray(
    metadata?.productFitReasons || metadata?.product_fit_reasons || input?.productFitReasons,
  );
  const productFitRecommended =
    typeof metadata?.productFitRecommended === "boolean"
      ? metadata.productFitRecommended
      : typeof metadata?.product_fit_recommended === "boolean"
        ? metadata.product_fit_recommended
        : null;
  const productFitBlocked =
    typeof metadata?.productFitBlocked === "boolean"
      ? metadata.productFitBlocked
      : typeof metadata?.product_fit_blocked === "boolean"
        ? metadata.product_fit_blocked
        : null;

  return {
    productProfileId: productProfileId || null,
    batchLabel: batchLabel || null,
    intentPrimary: intentPrimary || null,
    intentSecondary: intentSecondary || null,
    awarenessStage: awarenessStage || null,
    painProximity,
    commercialityScore,
    emotionTags,
    identityTags,
    queryChainDepth,
    evergreenScore,
    jtbd: jtbd || null,
    pinAngle: pinAngle || null,
    identityArchetype: identityArchetype || null,
    ecosystemCluster: ecosystemCluster || null,
    futureSelfSignal: futureSelfSignal || null,
    saveReason: saveReason || null,
    utilityType: utilityType || null,
    discoveryScore,
    retailCommonalityScore,
    rabbitHoleScore,
    visualClarityScore,
    savePotentialScore,
    amazonDiscoveryScore,
    seasonalityScore,
    landingPageMatchScore,
    landingPageMatchReason: landingPageMatchReason || null,
    productFitScore,
    productFitState: productFitState || null,
    productFitReasons,
    productFitRecommended,
    productFitBlocked,
  };
}
