import { getPrismaClient } from "../../utils/prisma.js";
import { serializeContentItem } from "./serializers.js";

const prisma = getPrismaClient();

export default async function showContent(req, res) {
	const id = Number.parseInt(req.params.id, 10);
	if (Number.isNaN(id)) {
		return res.status(400).json({ message: "Content item id must be a number" });
	}

	try {
		const contentItem = await prisma.contentItem.findUnique({
			where: { id },
			include: {
				contentAssets: true,
				platformTargets: true,
				user: true,
			},
		});

		if (!contentItem) {
			return res.status(404).json({ message: "Content item not found" });
		}

		return res.json({
			data: serializeContentItem(contentItem),
		});
	} catch (error) {
		console.error("Failed to load content item", error);
		return res.status(500).json({ message: "Failed to load content item" });
	}
}
