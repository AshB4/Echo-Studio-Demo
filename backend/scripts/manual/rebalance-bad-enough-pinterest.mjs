import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";

const PAIRS = [
  ["What I Called Anxiety Was Information", "I Didn't Lose Love. I Chose Peace."],
  ["Calm That Depends On Vigilance Isn't Peace", "You're Finally Off Duty"],
  ["I Wasn't Confused. I Was Carrying Too Much.", "My Body Wasn't Wrong. It Was Early."],
  ["The Absence Is The Signal", "Peace Is The Standard, Not The Exception"],
  [
    "Quiet Became The Evidence",
    "You Do Not Need To Debate Yourself Into Exhaustion To Deserve Peace",
  ],
];

await initLocalDb();
const snapshot = await readStoreSnapshot();
const byTitle = new Map(snapshot.posts.map((post) => [post.title, post]));
const rewritten = new Map();

PAIRS.forEach((pair, dayIndex) => {
  const date = new Date("2026-07-28T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + dayIndex);
  const day = date.toISOString().slice(0, 10);
  const slots = ["15:00:00.000Z", "15:30:00.000Z"];

  pair.forEach((title, slotIndex) => {
    const post = byTitle.get(title);
    if (!post) throw new Error(`Missing queued post: ${title}`);
    rewritten.set(post.id, {
      ...post,
      scheduledAt: `${day}T${slots[slotIndex]}`,
      updatedAt: new Date().toISOString(),
    });
  });
});

await replaceStoreSnapshot({
  posts: snapshot.posts.map((post) => rewritten.get(post.id) || post),
  postedLog: snapshot.postedLog,
  rejections: snapshot.rejections,
});

console.log(
  JSON.stringify(
    [...rewritten.values()]
      .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)))
      .map((post) => ({
        date: post.scheduledAt.slice(0, 10),
        time: post.scheduledAt.slice(11, 16),
        title: post.title,
        media: String(post.mediaPath || "").split("/").pop(),
        board: post.metadata?.pinterestBoard,
      })),
    null,
    2,
  ),
);
