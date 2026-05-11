import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const queuePath = path.join(repoRoot, 'backend/queue/postQueue.json');
const tinyImagePath = 'frontend/assets/TinyKingdoms/TkCoverFRont.png';
const shiftMs = 14 * 24 * 60 * 60 * 1000;
const windowStart = new Date('2026-05-17T00:00:00.000Z').getTime();
const nowIso = new Date().toISOString();
const shiftMarker = 'tiny-kingdoms-window-v1';

const tinyPosts = [
  {
    id: 'p_20260517_tinyfb_01',
    title: 'Tiny Kingdoms Is Almost Done',
    body: `Hey, this one is almost done.

Tiny Kingdoms has been sitting in that annoying almost-finished state where it looks real but still needs the last bits to click together.

The cover is up here and the whole thing is finally starting to feel like a little world instead of a folder full of ideas.

If you were building a tiny kingdom, what would it be?

* castle
* forest
* village
* ruins
* something weirder`,
    scheduledAt: '2026-05-17T15:00:00.000Z',
  },
  {
    id: 'p_20260524_tinyfb_02',
    title: 'Tiny Kingdoms Cover Preview',
    body: `Another Tiny Kingdoms check-in.

The cover is here, and I wanted to post it before I disappear into the final stretch of finishing work.

I like projects that already feel like they belong to a little world even before they are fully done.

If this became a real product, what would you want most?

* more pages
* a bigger edition
* a whole series of tiny worlds
* something else entirely`,
    scheduledAt: '2026-05-24T15:00:00.000Z',
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isApprovedFacebookPost(post) {
  return (
    post?.status === 'approved' &&
    Array.isArray(post?.platforms) &&
    post.platforms.includes('facebook') &&
    typeof post.scheduledAt === 'string' &&
    new Date(post.scheduledAt).getTime() >= windowStart
  );
}

function shiftPost(post) {
  const next = clone(post);
  next.scheduledAt = new Date(new Date(post.scheduledAt).getTime() + shiftMs).toISOString();
  next.nextAttemptAt = null;
  next.updatedAt = nowIso;
  next.metadata = { ...(next.metadata || {}), scheduleShiftedBy: shiftMarker };
  return next;
}

function buildTinyPost(template) {
  return {
    id: template.id,
    title: template.title,
    body: template.body,
    platforms: ['facebook'],
    targets: [{ platform: 'facebook', accountId: null }],
    mediaPath: tinyImagePath,
    mediaType: 'image',
    scheduledAt: template.scheduledAt,
    status: 'approved',
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorAt: null,
    metadata: {
      contentTags: ['tiny-kingdoms', 'fantasy', 'cover', 'book'],
      distributionTags: ['post:facebook'],
      approvalSource: 'manual-json',
      requiresReview: false,
      productProfileId: 'tiny-kingdoms',
      productProfileLabel: 'Tiny Kingdoms',
      productCategory: 'Physical products',
      productLinks: {
        gumroad: '',
        amazon: '',
        primary: '',
      },
      scheduleCampaign: 'tiny-kingdoms-facebook-window',
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const raw = await fs.readFile(queuePath, 'utf8');
const queue = JSON.parse(raw);

const shiftedQueue = queue.map((post) => {
  if (!isApprovedFacebookPost(post)) {
    return post;
  }
  if (post?.metadata?.scheduleShiftedBy === shiftMarker) {
    return post;
  }
  return shiftPost(post);
});

const tinyIds = new Set(tinyPosts.map((post) => post.id));
const cleanedQueue = shiftedQueue.filter((post) => !tinyIds.has(post.id));
const nextQueue = [...cleanedQueue, ...tinyPosts.map(buildTinyPost)];

nextQueue.sort((a, b) => {
  const aTime = new Date(a.scheduledAt || 0).getTime();
  const bTime = new Date(b.scheduledAt || 0).getTime();
  if (aTime !== bTime) return aTime - bTime;
  const aCreated = new Date(a.createdAt || 0).getTime();
  const bCreated = new Date(b.createdAt || 0).getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;
  return String(a.id || '').localeCompare(String(b.id || ''));
});

await fs.writeFile(queuePath, `${JSON.stringify(nextQueue, null, 2)}\n`);

console.log(JSON.stringify({
  queuePath,
  shiftedFacebookPosts: queue.filter(isApprovedFacebookPost).length,
  tinyPostsAdded: tinyPosts.length,
  totalPosts: nextQueue.length,
}, null, 2));
