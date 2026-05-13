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

function inferKnownIdentity(text, mediaPath = "") {
  const media = basenameLower(mediaPath);
  const fullMedia = String(mediaPath || "").toLowerCase();
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
  if (/bubble mower|splash pad|splashez|water play|gardening toy|kids gardening|backyard toy|toddler/.test(source)) {
    return {
      productProfileId: "amazon-kids-backyard-play",
      batchLabel: "gardening-and-splash-mix",
    };
  }
  if (/creator-spring|teespring|start-anyway|frog circle shirt|frog shirt|frog hoodie/.test(source)) {
    return {
      productProfileId: "start-anyway-frog",
      batchLabel: "start-anyway-frog",
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
  };
}
