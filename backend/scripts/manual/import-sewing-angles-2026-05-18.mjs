import { initLocalDb, listPosts, createPost } from "../../utils/localDb.mjs";
import { findDuplicatePost } from "../../utils/queueGuard.mjs";

const SLOTS_UTC = ["15:00", "15:20", "15:40", "16:00"];
const START_DATE = "2026-07-17";
const BATCH_LABEL = "sewing-followups-2026-05-18";

const SOURCES = [
	{
		sourceImage: "MetalbobbinswithSewingmachine.jpg",
		productProfileId: "amazon-sewing-metal-bobbins",
		productProfileLabel: "Metal Sewing Bobbins",
		keywordCluster: "sewing bobbins",
		board: "Make it sew!",
		boards: ["Make it sew!", "I'm so Crafty....", "Actually useful"],
		angles: [
			{
				title: "The Sewing Supply Beginners Forget Until Thread Starts Tangling",
				body: "Extra bobbins save way more frustration than people expect. A tiny sewing upgrade that makes projects feel calmer fast.",
				primaryKeyword: "extra sewing machine bobbins",
				angleType: "problem_solution",
				visualConcept: "Close-up sewing machine setup showing threaded metal bobbins beside fabric.",
				whyThisCouldWork: "Solves a common beginner pain point while feeling practical and save-worthy.",
			},
			{
				title: "Tiny Sewing Upgrades That Make Crafting Feel Less Chaotic",
				body: "Small tools can make sewing feel calmer fast. This is one of those boring little upgrades that ends up mattering.",
				primaryKeyword: "sewing organization tools",
				angleType: "tiny_life_upgrade",
				visualConcept: "Organized bobbins beside neatly threaded fabric and machine details.",
				whyThisCouldWork: "Pinterest users love calm productivity and tiny practical upgrades.",
			},
			{
				title: "Why Experienced Sewers Keep Multiple Bobbins Ready",
				body: "Switching thread colors gets easier when you prep ahead. Keeping extras ready makes hobby time feel smoother.",
				primaryKeyword: "metal bobbins for sewing machine",
				angleType: "utility",
				visualConcept: "Multiple threaded bobbins arranged near an active sewing machine.",
				whyThisCouldWork: "Feels instructional and useful without sounding overly sales-focused.",
			},
			{
				title: "Cozy Hobby Nights Start With Being Prepared",
				body: "Nothing ruins sewing momentum like running out of threaded bobbins. Quiet prep makes hobby nights feel better.",
				primaryKeyword: "cozy sewing setup",
				angleType: "comfort_relief",
				visualConcept: "Warm sewing scene with textured fabric and colorful thread spools.",
				whyThisCouldWork: "Combines emotional comfort with practical hobby preparation.",
			},
			{
				title: "Sewing Supplies That Quietly Save Hours",
				body: "Prepped bobbins make sewing sessions smoother and faster. Not glamorous, just actually useful.",
				primaryKeyword: "best sewing accessories",
				angleType: "soft_productivity",
				visualConcept: "Functional workstation vibe with bobbins and fabric in-use.",
				whyThisCouldWork: "Soft productivity framing performs well on Pinterest craft audiences.",
			},
		],
	},
	{
		sourceImage: "AluminumBobbin.jpg",
		productProfileId: "amazon-sewing-aluminum-bobbins",
		productProfileLabel: "Aluminum Sewing Bobbins",
		keywordCluster: "aluminum sewing bobbins",
		board: "Make it sew!",
		boards: ["Make it sew!", "Actually useful", "I'm so Crafty...."],
		angles: [
			{
				title: "Metal vs Plastic Bobbins Explained for Beginners",
				body: "Not all bobbins work the same way in every machine. This tiny part causes more confusion than it should.",
				primaryKeyword: "metal vs plastic bobbins",
				angleType: "beginner",
				visualConcept: "Single aluminum bobbin with clean comparison-style educational overlay.",
				whyThisCouldWork: "Comparison content gets saved heavily by beginner sewists.",
			},
			{
				title: "The Tiny Sewing Part That Can Affect Your Stitches",
				body: "Your bobbin choice matters more than most beginners realize. Tiny setup details can change the whole sewing mood.",
				primaryKeyword: "aluminum sewing bobbin",
				angleType: "utility",
				visualConcept: "Minimalist close-up highlighting bobbin structure and details.",
				whyThisCouldWork: "Creates curiosity around a tiny overlooked sewing component.",
			},
			{
				title: "Why Some Sewers Prefer Metal Bobbins",
				body: "A lot of experienced sewists still swear by aluminum bobbins. Sometimes the boring supplies really do matter.",
				primaryKeyword: "metal sewing bobbins",
				angleType: "identity",
				visualConcept: "Industrial-clean sewing aesthetic with educational framing.",
				whyThisCouldWork: "Leverages authority and craft identity psychology.",
			},
			{
				title: "Sewing Machine Basics Nobody Explains Clearly",
				body: "This tiny part causes more confusion than it should. A simple bobbin guide can save a lot of frustration later.",
				primaryKeyword: "sewing machine bobbin guide",
				angleType: "problem_solution",
				visualConcept: "Educational infographic framing with simplified explanations.",
				whyThisCouldWork: "Pinterest users save practical beginner explanations for later.",
			},
			{
				title: "The Practical Sewing Supply You’ll Eventually Need",
				body: "Most sewing hobbyists end up buying extra bobbins anyway. Future-you will probably appreciate having them ready.",
				primaryKeyword: "extra aluminum bobbins",
				angleType: "amazon_find",
				visualConcept: "Clean product-focused image with utility-first text overlay.",
				whyThisCouldWork: "Frames the product as inevitable future convenience.",
			},
		],
	},
	{
		sourceImage: "plasticbobbinmachine.jpg",
		productProfileId: "amazon-sewing-plastic-bobbins",
		productProfileLabel: "Plastic Sewing Bobbins",
		keywordCluster: "plastic sewing bobbins",
		board: "Make it sew!",
		boards: ["Make it sew!", "Actually useful", "I'm so Crafty...."],
		angles: [
			{
				title: "The Beginner Sewing Upgrade That Saves So Much Time",
				body: "Extra bobbins make switching colors way less annoying. Tiny prep steps make sewing feel easier fast.",
				primaryKeyword: "plastic sewing bobbins",
				angleType: "tiny_life_upgrade",
				visualConcept: "Hands actively sewing beside clear threaded bobbins.",
				whyThisCouldWork: "Shows real-world use and immediate practical benefit.",
			},
			{
				title: "Why Your Sewing Setup Feels More Chaotic Than It Should",
				body: "Prepared bobbins make projects smoother instantly. Less friction means more actual sewing.",
				primaryKeyword: "sewing organization tips",
				angleType: "problem_solution",
				visualConcept: "Simple sewing workspace with organized bobbins and thread.",
				whyThisCouldWork: "Targets frustration relief and calm productivity.",
			},
			{
				title: "Cute Hobby Energy Starts With Tiny Helpful Tools",
				body: "Little sewing upgrades make crafting feel more relaxing. Practical can still feel cozy.",
				primaryKeyword: "cozy sewing accessories",
				angleType: "comfort_relief",
				visualConcept: "Soft bright sewing scene with beginner-friendly atmosphere.",
				whyThisCouldWork: "Combines cozy crafting identity with useful tools.",
			},
			{
				title: "Sewing Supplies I Wish I Bought Earlier",
				body: "This tiny upgrade removes a surprising amount of friction. Small supplies can change the whole flow.",
				primaryKeyword: "must have sewing supplies",
				angleType: "soft_productivity",
				visualConcept: "Practical sewing setup emphasizing ease and efficiency.",
				whyThisCouldWork: "“Wish I knew sooner” framing performs strongly on Pinterest.",
			},
			{
				title: "How People Actually Stay Consistent With Sewing",
				body: "Prepared supplies make hobby time feel less overwhelming. Easier setup means you come back to it more often.",
				primaryKeyword: "easy sewing setup",
				angleType: "burnout_relief",
				visualConcept: "Relaxed beginner sewing environment with pre-threaded bobbins.",
				whyThisCouldWork: "Targets overwhelmed hobbyists seeking easier routines.",
			},
		],
	},
	{
		sourceImage: "2plasticBobbins.jpg",
		productProfileId: "amazon-sewing-plastic-bobbins",
		productProfileLabel: "Plastic Sewing Bobbins",
		keywordCluster: "plastic sewing bobbins",
		board: "Make it sew!",
		boards: ["Make it sew!", "Actually useful", "I'm so Crafty...."],
		angles: [
			{
				title: "The Tiny Sewing Supply Beginners Always Forget",
				body: "Nobody talks about bobbins until you suddenly need more. Future-you will be happier if extras are ready.",
				primaryKeyword: "extra plastic bobbins",
				angleType: "beginner",
				visualConcept: "Minimal clean bobbin close-up with educational overlay text.",
				whyThisCouldWork: "Simple practical reminders perform well in hobby niches.",
			},
			{
				title: "Tiny Craft Supplies That Make Sewing Less Stressful",
				body: "Having backups ready makes projects flow better. Calm hobby systems start with boring little basics.",
				primaryKeyword: "plastic sewing bobbins",
				angleType: "comfort_relief",
				visualConcept: "Soft neutral aesthetic emphasizing calm organization.",
				whyThisCouldWork: "Pairs emotional calm with practical utility.",
			},
			{
				title: "Sewing Machine Accessories Worth Buying Early",
				body: "Future-you will absolutely appreciate having extras ready. This is one of those low-drama useful purchases.",
				primaryKeyword: "best sewing machine accessories",
				angleType: "amazon_find",
				visualConcept: "Simple product-focused image with future-self framing.",
				whyThisCouldWork: "Pinterest users save future convenience purchases heavily.",
			},
			{
				title: "The Practical Sewing Upgrade Nobody Gets Excited About",
				body: "Until it suddenly saves your entire project. Not flashy, just the kind of boring tool that earns its keep.",
				primaryKeyword: "clear sewing bobbins",
				angleType: "utility",
				visualConcept: "Minimalist product framing with subtle humor overlay.",
				whyThisCouldWork: "Humor plus utility makes plain products more engaging.",
			},
			{
				title: "Tiny Sewing Tools That Quietly Save Time",
				body: "Prepared bobbins reduce interruptions during projects. Tiny systems make hobby time feel smoother.",
				primaryKeyword: "sewing project organization",
				angleType: "soft_productivity",
				visualConcept: "Simple clean bobbins styled as an organized crafting essential.",
				whyThisCouldWork: "Soft productivity content aligns with Pinterest behavior.",
			},
		],
	},
	{
		sourceImage: "plasticbobbinthredOn.jpg",
		productProfileId: "amazon-sewing-plastic-bobbins",
		productProfileLabel: "Plastic Sewing Bobbins",
		keywordCluster: "threaded sewing bobbins",
		board: "Make it sew!",
		boards: ["Make it sew!", "Actually useful", "I'm so Crafty...."],
		angles: [
			{
				title: "Pre-Threaded Bobbins Make Sewing Feel So Much Easier",
				body: "Color changes stop feeling annoying when you prep ahead. Tiny convenience, big difference in momentum.",
				primaryKeyword: "pre threaded sewing bobbins",
				angleType: "tiny_life_upgrade",
				visualConcept: "Colorful thread-loaded bobbins styled neatly together.",
				whyThisCouldWork: "Bright thread colors improve saves while utility drives clicks.",
			},
			{
				title: "Sewing Habits That Make Projects Less Overwhelming",
				body: "Prepared bobbins remove tiny frustrations before they happen. Small systems make the hobby feel calmer.",
				primaryKeyword: "easy sewing organization",
				angleType: "burnout_relief",
				visualConcept: "Organized thread colors with clean calming composition.",
				whyThisCouldWork: "Targets overwhelmed hobbyists seeking easier crafting systems.",
			},
			{
				title: "Why Organized Sewers Preload Their Bobbins",
				body: "Small prep work creates smoother sewing sessions. It looks fussy until you actually need to switch colors fast.",
				primaryKeyword: "threaded sewing bobbins",
				angleType: "soft_productivity",
				visualConcept: "Neatly threaded bobbins grouped by color families.",
				whyThisCouldWork: "Feels satisfying and productivity-oriented.",
			},
			{
				title: "The Sewing Setup Trick That Saves Your Momentum",
				body: "Stopping to rewind bobbins kills creative flow fast. A little prep keeps projects moving.",
				primaryKeyword: "sewing workflow tips",
				angleType: "problem_solution",
				visualConcept: "Prepared colorful bobbins framed as workflow essentials.",
				whyThisCouldWork: "Focuses on preserving creative momentum and reducing friction.",
			},
			{
				title: "Cute Sewing Organization Ideas That Actually Help",
				body: "Functional can still look satisfying. Organized thread colors make sewing space feel better too.",
				primaryKeyword: "cute sewing organization",
				angleType: "identity",
				visualConcept: "Bright thread colors arranged aesthetically on clear bobbins.",
				whyThisCouldWork: "Combines visual satisfaction with practical crafting identity.",
			},
		],
	},
	{
		sourceImage: "victorianSewingKit.jpg",
		productProfileId: "amazon-victorian-sewing-kit",
		productProfileLabel: "Victorian Sewing Kit",
		keywordCluster: "vintage sewing kit",
		board: "Make it sew!",
		boards: ["Make it sew!", "I'm so Crafty....", "I Want, I dream."],
		angles: [
			{
				title: "The Cozy Sewing Kit That Feels Like Cottagecore Treasure",
				body: "Vintage sewing tools make crafting feel magical again. This is pure cozy hobby energy.",
				primaryKeyword: "victorian sewing kit",
				angleType: "identity",
				visualConcept: "Warm antique-style flatlay emphasizing ornate details and wood textures.",
				whyThisCouldWork: "Cottagecore and vintage hobby aesthetics perform strongly on Pinterest.",
			},
			{
				title: "Pretty Sewing Supplies That Make You Want to Create Again",
				body: "Beautiful tools can actually inspire hobby motivation. Sometimes the setup is what gets you back into making things.",
				primaryKeyword: "beautiful sewing tools",
				angleType: "emotional",
				visualConcept: "Elegant composition focusing on ornate scissors and wooden box.",
				whyThisCouldWork: "Emotion-driven hobby inspiration encourages saves.",
			},
			{
				title: "The Vintage Craft Kit Every Cozy Hobby Person Wants",
				body: "This looks like something from a fantasy sewing room. Useful and aggressively cozy at the same time.",
				primaryKeyword: "vintage sewing accessories",
				angleType: "comfort_relief",
				visualConcept: "Romantic vintage styling with soft warm tones.",
				whyThisCouldWork: "Aspirational hobby identity drives Pinterest engagement.",
			},
			{
				title: "Sewing Gifts That Actually Feel Thoughtful",
				body: "This sewing kit feels personal instead of generic. A good gift when you want useful and lovely together.",
				primaryKeyword: "gift ideas for sewists",
				angleType: "amazon_find",
				visualConcept: "Gift-focused composition highlighting premium presentation.",
				whyThisCouldWork: "Pinterest users heavily save thoughtful gift inspiration.",
			},
			{
				title: "Tiny Antique-Looking Tools That Make Crafting More Fun",
				body: "Sometimes aesthetics really do improve the experience. Pretty tools make it easier to want to sit down and create.",
				primaryKeyword: "antique sewing kit",
				angleType: "side_quest",
				visualConcept: "Close-up detail shots of ornate sewing accessories.",
				whyThisCouldWork: "Novelty plus cozy aesthetics creates high save potential.",
			},
		],
	},
	{
		sourceImage: "ItemsInVictorianSewingKit.jpg",
		productProfileId: "amazon-victorian-sewing-kit",
		productProfileLabel: "Victorian Sewing Kit",
		keywordCluster: "vintage sewing accessories",
		board: "Make it sew!",
		boards: ["Make it sew!", "I'm so Crafty....", "I Want, I dream."],
		angles: [
			{
				title: "The Prettiest Sewing Tools I’ve Seen in a While",
				body: "Tiny ornate details make this feel straight out of a storybook. It is the rare practical tool set that feels decorative too.",
				primaryKeyword: "ornate sewing tools",
				angleType: "identity",
				visualConcept: "Detailed flatlay showcasing each vintage-inspired item individually.",
				whyThisCouldWork: "Pinterest audiences love visually satisfying tiny-object collections.",
			},
			{
				title: "Cottagecore Craft Supplies That Feel Weirdly Luxurious",
				body: "These tiny sewing tools make hobbies feel more romantic. Cozy aesthetic plus actual usefulness is a strong combo.",
				primaryKeyword: "cottagecore sewing kit",
				angleType: "comfort_relief",
				visualConcept: "Soft antique-inspired layout with muted warm tones.",
				whyThisCouldWork: "Taps directly into cozy aesthetic aspiration behavior.",
			},
			{
				title: "The Sewing Kit That Makes Crafting Feel Less Boring",
				body: "Cute tools genuinely make hobbies easier to return to. Sometimes lovely supplies are the motivation.",
				primaryKeyword: "cute sewing accessories",
				angleType: "emotional",
				visualConcept: "Whimsical arrangement emphasizing decorative details and craftsmanship.",
				whyThisCouldWork: "Emotional hobby reinforcement increases saves and engagement.",
			},
			{
				title: "Tiny Vintage Sewing Supplies People Keep Saving",
				body: "This kit looks handmade even before you start crafting. It hits that pretty-useful Pinterest sweet spot.",
				primaryKeyword: "vintage sewing supplies",
				angleType: "amazon_find",
				visualConcept: "Pinterest-style aesthetic collage emphasizing ornate utility tools.",
				whyThisCouldWork: "Vintage aesthetics consistently perform well in craft niches.",
			},
			{
				title: "Why Pretty Hobby Tools Actually Matter",
				body: "Beautiful setups make creative routines easier to enjoy. Sometimes loving the tools is part of showing up.",
				primaryKeyword: "cozy hobby tools",
				angleType: "soft_productivity",
				visualConcept: "Elegant organized layout with focus on calming creative atmosphere.",
				whyThisCouldWork: "Combines productivity with emotional comfort and identity.",
			},
		],
	},
];

function isoFor(index) {
	const base = new Date(`${START_DATE}T00:00:00.000Z`);
	const dayOffset = Math.floor(index / SLOTS_UTC.length);
	const [hour, minute] = SLOTS_UTC[index % SLOTS_UTC.length].split(":").map(Number);
	base.setUTCDate(base.getUTCDate() + dayOffset);
	base.setUTCHours(hour, minute, 0, 0);
	return base.toISOString();
}

function normalizeAngleType(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function makeId(index) {
	return `p_sewing_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildTags(angle, source) {
	const keywordWords = String(angle.primaryKeyword || "")
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 4);
	return Array.from(
		new Set([
			source.keywordCluster,
			angle.primaryKeyword,
			source.productProfileLabel,
			...keywordWords,
		]),
	)
		.map((value) => String(value || "").trim().toLowerCase())
		.filter(Boolean)
		.slice(0, 6);
}

function buildPost(source, angle, index) {
	const angleType = normalizeAngleType(angle.angleType);
	return {
		id: makeId(index),
		title: angle.title,
		body: angle.body,
		platforms: ["pinterest"],
		scheduledAt: isoFor(index),
		status: "approved",
		mediaPath: `frontend/assets/spring2026/Sewing/${source.sourceImage}`,
		mediaType: "image",
		tags: buildTags(angle, source),
		createdAt: new Date().toISOString(),
		metadata: {
			contentMode: "brand_or_affiliate",
			productProfileId: source.productProfileId,
			productProfileLabel: source.productProfileLabel,
			contentTags: buildTags(angle, source),
			distributionTags: ["post:pinterest"],
			pinterestBoard: source.board,
			pinterestBoards: source.boards,
			pinterestTags: buildTags(angle, source),
			productLinks: {
				primary: "",
				amazon: "",
			},
			includeProductLink: false,
			keyword: angle.primaryKeyword,
			angle: angle.pinHook,
			angleType,
			semanticCluster: source.keywordCluster,
			ecosystemCluster:
				source.productProfileId === "amazon-victorian-sewing-kit"
					? "cozy vintage sewing"
					: "practical sewing utility",
			visualHook: angle.visualConcept,
			whyThisCouldWork: angle.whyThisCouldWork,
			sourceImage: source.sourceImage,
			batchLabel: BATCH_LABEL,
		},
	};
}

async function main() {
	await initLocalDb();
	const existing = await listPosts();
	const inserted = [];
	const skipped = [];
	const rows = SOURCES.flatMap((source) => source.angles.map((angle) => ({ source, angle })));

	for (const [index, row] of rows.entries()) {
		const post = buildPost(row.source, row.angle, index);
		const duplicate = findDuplicatePost([...existing, ...inserted], post);
		if (duplicate) {
			skipped.push({ title: post.title, reason: `duplicate:${duplicate.id}` });
			continue;
		}
		await createPost(post);
		inserted.push(post);
	}

	console.log(
		JSON.stringify(
			{
				inserted: inserted.map((post) => ({
					title: post.title,
					scheduledAt: post.scheduledAt,
					productProfileId: post.metadata.productProfileId,
					mediaPath: post.mediaPath,
				})),
				skipped,
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error?.stack || String(error));
	process.exitCode = 1;
});
