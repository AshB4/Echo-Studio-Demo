function parseJsonField(value) {
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export function serializeContentItem(contentItem) {
	if (!contentItem || typeof contentItem !== "object") return contentItem;

	return {
		...contentItem,
		metadata: parseJsonField(contentItem.metadata),
		lineage: parseJsonField(contentItem.lineage),
		platformTargets: Array.isArray(contentItem.platformTargets)
			? contentItem.platformTargets.map((target) => ({
					...target,
					metadata: parseJsonField(target.metadata),
				}))
			: contentItem.platformTargets,
	};
}
