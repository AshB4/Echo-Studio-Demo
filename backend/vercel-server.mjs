import express from "express";
import cors from "cors";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = express();

app.use(cors());
app.use(express.json());

const campaignSources = [
  require("./config/affiliate-batches/buzzing-bees-wellness-pinterest.json"),
  require("./config/affiliate-batches/goblin-existing-stubbornly-pinterest.json"),
  require("./config/affiliate-batches/bad-enough-book-pinterest.json"),
  require("./config/affiliate-batches/buzzing-evergreen-direct-april.json")
];

const start = new Date("2026-07-21T15:00:00.000Z");

const demoPosts = campaignSources.flatMap((campaign, campaignIndex) =>
  campaign.items.map((item, itemIndex) => {
    const globalIndex = campaignSources
      .slice(0, campaignIndex)
      .reduce((total, source) => total + source.items.length, 0) + itemIndex;

    const scheduledAt = new Date(start);
    scheduledAt.setUTCDate(start.getUTCDate() + globalIndex);

    return {
      id: `demo-post-${globalIndex + 1}`,
      title: item.title,
      body: item.description,
      description: item.description,
      status: "approved",
      platform: "pinterest",
      platforms: ["pinterest"],
      image: item.image,
      imageUrl: item.image,
      board: item.board || campaign.board || "coloring pages",
      boards: item.boards || [],
      tags: item.tags || [],
      keyword: item.keyword || "",
      angle: item.angle || "",
      productLink: campaign.productLink || "",
      campaign: campaign.campaign || `campaign-${campaignIndex + 1}`,
      scheduledAt: scheduledAt.toISOString(),
      createdAt: "2026-07-20T12:00:00.000Z"
    };
  })
);

const demoCampaigns = campaignSources.map((campaign, index) => {
  const campaignName = campaign.campaign || `campaign-${index + 1}`;
  const generatedPosts = demoPosts.filter((post) => post.campaign === campaignName);

  return {
    id: campaignName,
    name: campaignName,
    title: campaignName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    productLink: campaign.productLink || "",
    mission: {
      businessGoal: "Promote a real product with reusable Pinterest campaign content.",
      audience: "Pinterest users interested in coloring, wellness, creativity, and self-care."
    },
    campaignStrategy: {
      theme: "Build Once. Market Everywhere.",
      platforms: ["pinterest"],
      objective: "Reuse proven campaign assets in a reliable public demo."
    },
    generatedPosts,
    status: "complete",
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z"
  };
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Echo Studio demo backend",
    campaigns: demoCampaigns.length,
    posts: demoPosts.length
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, campaigns: demoCampaigns.length, posts: demoPosts.length });
});

app.get("/api/posts", (_req, res) => {
  res.json(demoPosts);
});

app.get("/api/campaigns", (_req, res) => {
  res.json({ data: demoCampaigns });
});

app.get("/api/campaigns/:id", (req, res) => {
  const campaign = demoCampaigns.find((item) => item.id === req.params.id);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  return res.json({ data: campaign });
});

export default app;
