import {
	normalizeContentLineage,
	normalizeContentMetadata,
	normalizeContentState,
} from "./contentModel.mjs";

function yamlScalar(value) {
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	const text = String(value ?? "");
	return JSON.stringify(text);
}

function yamlFieldLines(key, value) {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) {
		if (value.length === 0) return [];
		return [`${key}:`, ...value.map((item) => `  - ${yamlScalar(item)}`)];
	}
	if (typeof value === "object") {
		const entries = Object.entries(value).filter(([, nestedValue]) => {
			if (nestedValue === null || nestedValue === undefined) return false;
			if (Array.isArray(nestedValue)) return nestedValue.length > 0;
			return true;
		});
		if (entries.length === 0) return [];
		return [
			`${key}:`,
			...entries.flatMap(([nestedKey, nestedValue]) => {
				if (Array.isArray(nestedValue)) {
					return [
						`  ${nestedKey}:`,
						...nestedValue.map((item) => `    - ${yamlScalar(item)}`),
					];
				}
				return [`  ${nestedKey}: ${yamlScalar(nestedValue)}`];
			}),
		];
	}
	return [`${key}: ${yamlScalar(value)}`];
}

export function buildAstroFrontmatter(content = {}) {
	const lifecycleState = normalizeContentState(content.lifecycleState || content.state);
	const metadata = normalizeContentMetadata(content.metadata, {
		canonicalSource: content.canonicalSource,
	});
	const lineage = normalizeContentLineage(content.lineage, {
		canonicalSource: content.canonicalSource || metadata.canonicalSource,
	});
	const canonicalUrl =
		content.canonicalUrl || metadata.canonicalUrl || metadata.canonicalSource || content.canonicalSource || null;
	const publishDate = content.publishDate || content.publishedAt || metadata.publishDate || null;

	return {
		title: content.title || "Untitled",
		description: content.description || content.excerpt || metadata.excerpt || "",
		excerpt: content.excerpt || metadata.excerpt || null,
		publishDate,
		state: lifecycleState,
		canonicalURL: content.canonicalUrl || metadata.canonicalUrl || canonicalUrl,
		canonicalSource: metadata.canonicalSource || null,
		externalUrls: metadata.externalUrls || content.externalUrls || null,
		syndicationStatus: metadata.syndicationStatus || content.syndicationStatus || null,
		platformIds: metadata.platformIds || content.platformIds || null,
		artifactType: metadata.artifactType || null,
		searchIntent: metadata.searchIntent || null,
		intentPrimary: metadata.intentPrimary || null,
		intentSecondary: metadata.intentSecondary || null,
		awarenessStage: metadata.awarenessStage || null,
		headline: metadata.headline || null,
		headlineVariants: metadata.headlineVariants || [],
		primaryEmotion: metadata.primaryEmotion || null,
		secondaryEmotion: metadata.secondaryEmotion || null,
		curiosityType: metadata.curiosityType || null,
		specificitySignals: metadata.specificitySignals || null,
		authoritySignals: metadata.authoritySignals || [],
		trustSignals: metadata.trustSignals || [],
		patternInterruptType: metadata.patternInterruptType || null,
		hookType: metadata.hookType || null,
		contentIntent: metadata.contentIntent || null,
		saveIntent: metadata.saveIntent || null,
		shareIntent: metadata.shareIntent || null,
		thumbnailConcept: metadata.thumbnailConcept || null,
		firstLine: metadata.firstLine || null,
		platformOptimizations: metadata.platformOptimizations || null,
		ctrScore: metadata.ctrScore ?? null,
		clarityScore: metadata.clarityScore ?? null,
		trustScore: metadata.trustScore ?? null,
		curiosityScore: metadata.curiosityScore ?? null,
		saveScore: metadata.saveScore ?? null,
		shareScore: metadata.shareScore ?? null,
		identityArchetype: metadata.identityArchetype || null,
		ecosystemCluster: metadata.ecosystemCluster || null,
		futureSelfSignal: metadata.futureSelfSignal || null,
		saveReason: metadata.saveReason || null,
		utilityType: metadata.utilityType || null,
		discoveryScore: metadata.discoveryScore ?? null,
		retailCommonalityScore: metadata.retailCommonalityScore ?? null,
		rabbitHoleScore: metadata.rabbitHoleScore ?? null,
		visualClarityScore: metadata.visualClarityScore ?? null,
		savePotentialScore: metadata.savePotentialScore ?? null,
		amazonDiscoveryScore: metadata.amazonDiscoveryScore ?? null,
		seasonalityScore: metadata.seasonalityScore ?? null,
		landingPageMatchScore: metadata.landingPageMatchScore ?? null,
		landingPageMatchReason: metadata.landingPageMatchReason || null,
		productFitScore: metadata.productFitScore ?? null,
		productFitState: metadata.productFitState || null,
		productFitReasons: metadata.productFitReasons || [],
		productFitRecommended: typeof metadata.productFitRecommended === "boolean" ? metadata.productFitRecommended : null,
		productFitBlocked: typeof metadata.productFitBlocked === "boolean" ? metadata.productFitBlocked : null,
		painProximity: metadata.painProximity ?? null,
		commercialityScore: metadata.commercialityScore ?? null,
		emotionTags: metadata.emotionTags || [],
		identityTags: metadata.identityTags || [],
		queryChainDepth: metadata.queryChainDepth ?? null,
		evergreenScore: metadata.evergreenScore ?? null,
		contentHalfLife: metadata.contentHalfLife || null,
		audienceStage: metadata.audienceStage || null,
		problemType: metadata.problemType || null,
		repurposePriority: metadata.repurposePriority ?? null,
		series: metadata.series || null,
		jtbd: metadata.jtbd || null,
		pinAngle: metadata.pinAngle || null,
		tags: metadata.tags || [],
		relatedContent: metadata.relatedContent || [],
		syndicationTargets: metadata.syndicationTargets || [],
		lineage,
	};
}

export function buildAstroMarkdownDocument(content = {}) {
	const frontmatter = buildAstroFrontmatter(content);
	const frontmatterLines = Object.entries(frontmatter).flatMap(([key, value]) =>
		yamlFieldLines(key, value),
	);
	const body = String(content.body || content.markdown || "").trim();

	return ["---", ...frontmatterLines, "---", "", body].join("\n").trimEnd() + "\n";
}
