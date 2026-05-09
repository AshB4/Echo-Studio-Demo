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
  if (/goblin|anti productivity|side quest|hot mess|doing less|move slowly|goblinaff/.test(source)) {
    return {
      productProfileId: "goblin-coloring-affirmations",
      batchLabel: "goblin-restored-mix",
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
  if (/prompt storm|prompt pack|creator reset/.test(source)) {
    return {
      productProfileId: "prompt-storm",
      batchLabel: "prompt-storm-pinterest",
    };
  }
  if (/bubble mower|splash pad|water play|gardening toy|kids gardening|backyard toy|toddler/.test(source)) {
    return {
      productProfileId: "amazon-kids-backyard-play",
      batchLabel: "gardening-and-splash-mix",
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

  const text = normalizedText([
    options?.batchFile,
    options?.campaign,
    explicitBatchLabel,
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

  const known = inferKnownIdentity(text, mediaPath);

  const productProfileId =
    explicitProductId && explicitProductId !== "restored-batch" && explicitProductId !== "unknown"
      ? explicitProductId
      : known?.productProfileId || slugify(explicitBatchLabel) || slugify(options?.campaign) || null;

  const batchLabel =
    explicitBatchLabel || known?.batchLabel || slugify(options?.campaign) || slugify(options?.batchFile) || null;

  return {
    productProfileId: productProfileId || null,
    batchLabel: batchLabel || null,
  };
}
