import test from "node:test";
import assert from "node:assert/strict";
import {
  inferPinterestQueueIdentity,
  inferStartAnywayIdentity,
} from "../utils/pinterestQueueIdentity.mjs";

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
  assert.equal(frog.productProfileId, "start-anyway-frog-tee");
});

test("inferStartAnywayIdentity separates hoodie from tee variants", () => {
  const hoodie = inferStartAnywayIdentity(
    "quiet chaos energy hoodie cozy outfit goblin core",
    "https://mockup-api.teespring.com/v3/image/hdkE-Y7DfD6OE9-4yGl0A8YCwBU/800/800.jpg",
  );
  const tee = inferStartAnywayIdentity(
    "minimal graphic tee start anyway frog shirt",
    "https://mockup-api.teespring.com/v3/image/fEaLBX6CWYMipUEzreinLgq6sK8/1200/1200.jpg",
  );

  assert.equal(hoodie.productProfileId, "start-anyway-frog-hoodie");
  assert.equal(tee.productProfileId, "start-anyway-frog-tee");
});

test("inferPinterestQueueIdentity respects sewing folder families", () => {
  const aluminum = inferPinterestQueueIdentity({
    title: "Why Some Sewers Prefer Metal Bobbins",
    mediaPath: "frontend/assets/spring2026/Sewing/AluminumBobbin.jpg",
  });
  const victorian = inferPinterestQueueIdentity({
    title: "The Cozy Sewing Kit That Feels Like Cottagecore Treasure",
    mediaPath: "frontend/assets/spring2026/Sewing/victorianSewingKit.jpg",
  });

  assert.equal(aluminum.productProfileId, "amazon-sewing-aluminum-bobbins");
  assert.equal(aluminum.batchLabel, "spring2026-sewing");
  assert.equal(victorian.productProfileId, "amazon-victorian-sewing-kit");
  assert.equal(victorian.batchLabel, "spring2026-sewing");
});

test("inferPinterestQueueIdentity respects GoblinTees subfamilies from folder paths", () => {
  const tee = inferPinterestQueueIdentity({
    title: "Chaos But Make It Fashion",
    mediaPath: "frontend/assets/goblinaffs/GoblinTees/BlackCLLTee.jpg",
  });
  const hoodie = inferPinterestQueueIdentity({
    title: "Gray Hoodie For Socially Tired Humans",
    mediaPath: "frontend/assets/goblinaffs/GoblinTees/DGrayCLL.jpg",
  });
  const tank = inferPinterestQueueIdentity({
    title: "Summer Gremlin Tank",
    mediaPath: "frontend/assets/goblinaffs/GoblinTees/TankGrayCLL.jpg",
  });
  const baby = inferPinterestQueueIdentity({
    title: "Baby Goblin Starter Pack",
    mediaPath: "frontend/assets/goblinaffs/GoblinTees/BlackBabyOnsie.jpg",
  });

  assert.equal(tee.productProfileId, "goblin-dark-tees");
  assert.equal(hoodie.productProfileId, "goblin-hoodies");
  assert.equal(tank.productProfileId, "goblin-tanks");
  assert.equal(baby.productProfileId, "goblin-certified-baby");
});
