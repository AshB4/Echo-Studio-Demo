import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const queuePath = path.join(repoRoot, 'backend/queue/postQueue.json');
const gardenImagePath = 'frontend/assets/GardenBricks/gardenEdgingV1.png';
const shiftMs = 14 * 24 * 60 * 60 * 1000;
const windowStart = new Date('2026-05-10T00:00:00.000Z').getTime();
const nowIso = new Date().toISOString();
const shiftMarker = 'gardenbricks-window-v1';
const gardenPrefix = 'p_202605';

const gardenPosts = [
  {
    id: 'p_20260510_gardenfb_01',
    title: 'Gardens With Soul',
    body: `Hot take:
modern landscaping is kinda dead inside.

Everything became:

* black plastic edging
* beige retaining wall blocks
* random mulch islands
* suburban Home Depot sadness

So I started designing gothic/victorian-inspired garden edging that feels more like old architecture reclaimed by nature.

Like...
forgotten abbey garden vibes instead of HOA depression.

This is the first prototype concept I am working on. Ignore the lower connection part for now - I am talking about the ornamental face/design itself.

What do y'all think?
Would you want to see stuff like this in real gardens?

And what styles would you want next?

* gothic cathedral?
* old cemetery?
* art nouveau botanical?
* haunted conservatory?
* New Orleans courtyard?
* romantic ruin?

I want honest feedback before I keep building this out.`,
    scheduledAt: '2026-05-10T15:00:00.000Z',
  },
  {
    id: 'p_20260513_gardenfb_02',
    title: 'Would You Put This In Your Garden?',
    body: `Be honest:
if garden edging looked like THIS instead of sad black plastic strips...

would you actually use it?

I am experimenting with modular gothic/victorian landscape edging and cast stone ornament because I feel like modern landscaping lost all personality.

I want gardens to feel:

* atmospheric
* old-world
* overgrown
* architectural
* romantic
* alive

Not just "mulch containment systems." 

This is early concept work, but I would love feedback:
What would make something like this feel AMAZING in a real garden?

What would you want to see?

* corners?
* pathway borders?
* mossy ruins?
* fountain pieces?
* gothic stepping stones?
* planter walls?
* trellis supports?

I am trying to build "gardens with soul."`,
    scheduledAt: '2026-05-13T15:00:00.000Z',
  },
  {
    id: 'p_20260516_gardenfb_03',
    title: 'Fantasy Without Looking Cheap',
    body: `One thing that drives me insane with a lot of "fantasy garden decor" is it looks too fake/plasticky/theme-park-ish.

I do not want that.

I want this stuff to feel like:
"this has existed in the garden for 80 years and nature slowly reclaimed it."

So I have been designing ornamental garden edging inspired by:

* gothic architecture
* cemetery stonework
* victorian ornament
* French courtyards
* romantic ruins

This is one of the first concept designs I am prototyping.

Would this kind of thing interest you?
And what direction should I explore more?

More:

* elegant?
* spooky?
* botanical?
* cathedral-inspired?
* Celtic?
* overgrown ruin?
* dark cottagecore?

Need outside opinions before I disappear into Blender goblin mode for 6 weeks.`,
    scheduledAt: '2026-05-16T15:00:00.000Z',
  },
  {
    id: 'p_20260519_gardenfb_04',
    title: 'Anti-Modern Landscaping',
    body: `I think landscaping got too sterile.

Too much:

* gray pavers
* plastic edging
* geometric minimalism
* fake luxury

I miss gardens that felt mysterious and romantic.

So I started concepting modular garden edging inspired by gothic/victorian architecture and old stone ornament.

The dream is basically:
"What if landscaping itself was beautiful again?"

This is one of the first concepts.

Would you want to see this as:

* concrete castings?
* aged terracotta?
* moss-friendly stone?
* resin prototypes?
* DIY molds?
* 3D printable versions?

And what would make you instantly obsessed with a product line like this?`,
    scheduledAt: '2026-05-19T15:00:00.000Z',
  },
  {
    id: 'p_20260522_gardenfb_05',
    title: 'Forgotten Estate Garden',
    body: `I am working on an idea for a garden hardscape brand built around this vibe:

"forgotten estate garden"
"hidden abbey courtyard"
"overgrown conservatory"
"beautiful ruins reclaimed by nature"

Basically the opposite of modern suburban landscaping.

This is one of my first edging concepts.
Still early.
Still prototyping.

But I genuinely think gardens deserve more architectural beauty than:
the mf black plastic strip.

I would love feedback:
If you saw a whole product line built around this aesthetic, what would you want most?

* edging
* pathway borders
* planters
* wall panels
* stepping stones
* mini ruins
* fountain pieces
* gothic greenhouse decor
* lantern bases
* graveyard herb markers

I want to know what people actually dream about for their outdoor spaces.`,
    scheduledAt: '2026-05-22T15:00:00.000Z',
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

function buildGardenPost(template) {
  return {
    id: template.id,
    title: template.title,
    body: template.body,
    platforms: ['facebook'],
    targets: [{ platform: 'facebook', accountId: null }],
    mediaPath: gardenImagePath,
    mediaType: 'image',
    scheduledAt: template.scheduledAt,
    status: 'approved',
    attemptCount: 0,
    nextAttemptAt: null,
    lastErrorAt: null,
    metadata: {
      contentTags: ['gardenbricks', 'garden', 'gothic', 'landscape'],
      distributionTags: ['post:facebook'],
      approvalSource: 'manual-json',
      requiresReview: false,
      productProfileId: 'gardenbricks',
      productProfileLabel: 'Garden Bricks',
      productCategory: 'Home & garden',
      productLinks: {
        gumroad: '',
        amazon: '',
        primary: '',
      },
      scheduleCampaign: 'gardenbricks-facebook-window',
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

const gardenIds = new Set(gardenPosts.map((post) => post.id));
const cleanedQueue = shiftedQueue.filter((post) => !gardenIds.has(post.id));
const nextQueue = [...cleanedQueue, ...gardenPosts.map(buildGardenPost)];

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
  gardenPostsAdded: gardenPosts.length,
  totalPosts: nextQueue.length,
}, null, 2));
