import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMixKey,
  buildSchedulePlan,
  mixRows,
  spreadRowsAcrossSchedule,
} from "../scripts/import-affiliate-batch.mjs";

test("buildMixKey prefers inferred product identity over raw batch grouping", () => {
  const goblin = buildMixKey({
    batchLabel: "remix-batch",
    title: "Goblin self care still counts",
    keyword: "goblin affirmations",
    productLink: "https://fleurdevie.gumroad.com/l/goblin-core-coloring-affirmations",
    tags: ["goblin"],
    image: "frontend/assets/goblinaffs/DeserveTreats.png",
  });
  const promptStorm = buildMixKey({
    batchLabel: "remix-batch",
    title: "Prompt pack for creator reset",
    keyword: "creator prompts",
    productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
    tags: ["prompt pack"],
    image: "frontend/assets/appImgs/promptstorm-banner.png",
  });

  assert.equal(goblin, "goblin-coloring-affirmations");
  assert.equal(promptStorm, "prompt-storm");
});

test("spreadRowsAcrossSchedule avoids near-repeat product runs when alternatives exist", () => {
  const rows = mixRows([
    {
      batchLabel: "remix",
      title: "Goblin one",
      keyword: "goblin",
      productLink: "https://fleurdevie.gumroad.com/l/goblin-core-coloring-affirmations",
      tags: ["goblin"],
      image: "frontend/assets/goblinaffs/DeserveTreats.png",
    },
    {
      batchLabel: "remix",
      title: "Goblin two",
      keyword: "goblin",
      productLink: "https://fleurdevie.gumroad.com/l/goblin-core-coloring-affirmations",
      tags: ["goblin"],
      image: "frontend/assets/goblinaffs/DoingLessStillSomething.png",
    },
    {
      batchLabel: "remix",
      title: "Prompt one",
      keyword: "prompt",
      productLink: "https://fleurdevie.gumroad.com/l/100prompt-storm",
      tags: ["prompt pack"],
      image: "frontend/assets/appImgs/promptstorm-banner.png",
    },
    {
      batchLabel: "remix",
      title: "Laneige one",
      keyword: "laneige lip mask",
      productLink: "https://www.amazon.com/dp/B0ABCDEF12",
      tags: ["dry lips"],
      image: "frontend/assets/appImgs/laneige-lips.png",
    },
    {
      batchLabel: "remix",
      title: "Olaplex one",
      keyword: "olaplex repair",
      productLink: "https://www.amazon.com/dp/B0FEDCBA21",
      tags: ["hair repair"],
      image: "frontend/assets/appImgs/olaplex-hair.png",
    },
  ]);
  const schedule = [
    "2026-05-20T15:00:00",
    "2026-05-20T15:20:00",
    "2026-05-20T15:40:00",
    "2026-05-20T16:00:00",
    "2026-05-21T15:00:00",
  ];

  const ordered = spreadRowsAcrossSchedule(rows, schedule).map(buildMixKey);

  assert.equal(new Set(ordered.slice(0, 4)).size, 4);
  assert.notEqual(ordered[0], ordered[1]);
  assert.notEqual(ordered[1], ordered[2]);
  assert.notEqual(ordered[2], ordered[3]);
  assert.equal(ordered[4], "goblin-coloring-affirmations");
});

test("buildSchedulePlan caps single-product imports at configured daily limit", () => {
  const schedule = buildSchedulePlan(4, "2026-07-28", {
    cadenceMode: "fixed",
    defaultPostsPerDay: 4,
    uniqueMixKeyCount: 1,
    maxSameProductPerDay: 2,
  });

  assert.deepEqual(schedule, [
    "2026-07-28T15:00:00",
    "2026-07-28T15:30:00",
    "2026-07-29T15:00:00",
    "2026-07-29T15:30:00",
  ]);
});

test("spreadRowsAcrossSchedule avoids same-day media and board repeats when possible", () => {
  const rows = [
    {
      batchLabel: "book",
      title: "Front A",
      keyword: "book",
      productLink: "https://www.amazon.com/dp/B0H33Q7T69",
      image: "frontend/assets/badEnough/front.png",
      board: "Art & quotes",
    },
    {
      batchLabel: "book",
      title: "Front B",
      keyword: "book",
      productLink: "https://www.amazon.com/dp/B0H33Q7T69",
      image: "frontend/assets/badEnough/front.png",
      board: "Art & quotes",
    },
    {
      batchLabel: "book",
      title: "Back A",
      keyword: "book",
      productLink: "https://www.amazon.com/dp/B0H33Q7T69",
      image: "frontend/assets/badEnough/back.png",
      board: "Beautiful me.",
    },
    {
      batchLabel: "book",
      title: "Back B",
      keyword: "book",
      productLink: "https://www.amazon.com/dp/B0H33Q7T69",
      image: "frontend/assets/badEnough/back.png",
      board: "Beautiful me.",
    },
  ];
  const schedule = [
    "2026-07-28T15:00:00",
    "2026-07-28T15:30:00",
    "2026-07-29T15:00:00",
    "2026-07-29T15:30:00",
  ];

  const ordered = spreadRowsAcrossSchedule(rows, schedule);

  assert.notEqual(ordered[0].image, ordered[1].image);
  assert.notEqual(ordered[0].board, ordered[1].board);
  assert.notEqual(ordered[2].image, ordered[3].image);
  assert.notEqual(ordered[2].board, ordered[3].board);
});
