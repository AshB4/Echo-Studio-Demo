import test from "node:test";
import assert from "node:assert/strict";
import { inferPinterestQueueIdentity } from "../utils/pinterestQueueIdentity.mjs";

test("inferPinterestQueueIdentity ignores goblin batch labels when product signals point elsewhere", () => {
  const result = inferPinterestQueueIdentity(
    {
      title: "Better starting points beat more pressure",
      description: "Prompt pack for creative block and creator workflow.",
      image: "frontend/assets/appImgs/promptstorm-banner.png",
      metadata: {
        keyword: "creative block help",
        angle: "systems over mood",
        pinterestTags: ["creative block", "creator workflow", "prompt pack"],
        productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
      },
    },
    {
      batchLabel: "goblin-restored-mix",
      batchFile: "restored-pins.json",
      campaign: "goblin-restored-mix",
      keyword: "creative block help",
      angle: "systems over mood",
      productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
      tags: ["creative block", "prompt pack"],
    },
  );

  assert.equal(result.productProfileId, "prompt-storm");
  assert.equal(result.batchLabel, "goblin-restored-mix");
});

test("inferPinterestQueueIdentity prefers specific non-goblin signals over goblin asset paths", () => {
  const promptStorm = inferPinterestQueueIdentity(
    {
      title: "Use Prompt Angles To Turn One Idea Into Ten Posts",
      image: "frontend/assets/goblinaffs/DoingLessStillSomething.png",
      metadata: {
        keyword: "creative block help",
        productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
      },
    },
    {
      productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
    },
  );
  const frog = inferPinterestQueueIdentity(
    {
      title: "Goblin Core Frog Shirt Aesthetic",
      metadata: {
        productLink: "https://my-store-10fedc5.creator-spring.com/apparel",
      },
    },
    {
      productLink: "https://my-store-10fedc5.creator-spring.com/apparel",
    },
  );

  assert.equal(promptStorm.productProfileId, "prompt-storm");
  assert.equal(frog.productProfileId, "start-anyway-frog");
});
