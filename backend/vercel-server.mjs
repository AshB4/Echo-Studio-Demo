import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

const demoPosts = [
  {
    id: "demo-post-1",
    title: "Build Once. Market Everywhere.",
    body: "Echo Studio turns one business goal into a connected campaign across strategy, content, assets, scheduling, and publishing.",
    status: "approved",
    platform: "facebook",
    platforms: ["facebook"],
    scheduledAt: "2026-07-21T15:00:00.000Z",
    createdAt: "2026-07-20T12:00:00.000Z"
  },
  {
    id: "demo-post-2",
    title: "One campaign, multiple platforms",
    body: "Create campaign strategy once, then adapt content for Pinterest, Facebook, and Dev.to.",
    status: "approved",
    platform: "pinterest",
    platforms: ["pinterest"],
    scheduledAt: "2026-07-22T18:00:00.000Z",
    createdAt: "2026-07-20T12:05:00.000Z"
  }
];

const demoCampaigns = [
  {
    id: "echo-studio-demo-campaign",
    name: "Echo Studio Hackathon Demo",
    title: "Echo Studio Hackathon Demo",
    mission: {
      businessGoal: "Turn one business goal into a complete multi-platform campaign.",
      audience: "Creators, indie founders, and small businesses."
    },
    campaignStrategy: {
      theme: "Build Once. Market Everywhere.",
      platforms: ["facebook", "pinterest", "devto"],
      objective: "Show the complete campaign workflow from strategy to publishing."
    },
    generatedPosts: demoPosts,
    status: "complete",
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z"
  }
];

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "Echo Studio demo backend"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/posts", (_req, res) => {
  res.json(demoPosts);
});

app.get("/api/campaigns", (_req, res) => {
  res.json({ data: demoCampaigns });
});

app.get("/api/campaigns/:id", (req, res) => {
  const campaign = demoCampaigns.find(
    (item) => item.id === req.params.id
  );

  if (!campaign) {
    return res.status(404).json({
      message: "Campaign not found"
    });
  }

  return res.json({ data: campaign });
});

export default app;
