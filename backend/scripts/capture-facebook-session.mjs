import "dotenv/config";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { mkdir } from "fs/promises";
import { chromium } from "playwright";

const BACKEND_ROOT = process.cwd();
const DEFAULT_PROFILE_DIR = path.join(BACKEND_ROOT, "config", "facebook-chrome-profile");
const DEFAULT_TARGET_URL = "https://www.facebook.com/ColorWithAshB";

function boolFromEnv(name, fallback = false) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

async function connectViaCdp(cdpUrl) {
	const browser = await chromium.connectOverCDP(cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(`Facebook CDP connected to ${cdpUrl}, but no browser context was available`);
	}
	return { browser, context };
}

async function main() {
	const rl = readline.createInterface({ input, output });
	const profileDir = process.env.FACEBOOK_CHROME_USER_DATA_DIR || DEFAULT_PROFILE_DIR;
	const profileName = process.env.FACEBOOK_CHROME_PROFILE_DIRECTORY || "Default";
	const channel = process.env.FACEBOOK_BROWSER_CHANNEL || "chrome";
	const executablePath = process.env.FACEBOOK_EXECUTABLE_PATH || undefined;
	const headless = boolFromEnv("FACEBOOK_HEADLESS", false);
	const useCdp = boolFromEnv("FACEBOOK_USE_CDP", false);
	const cdpUrl = process.env.FACEBOOK_CDP_URL || "http://127.0.0.1:9222";
	const targetUrl = process.env.FACEBOOK_TARGET_URL || DEFAULT_TARGET_URL;

	await mkdir(profileDir, { recursive: true });
	const context = useCdp
		? (({ context } = await connectViaCdp(cdpUrl)), context)
		: await chromium.launchPersistentContext(profileDir, {
				channel,
				executablePath,
				headless,
				viewport: { width: 1440, height: 960 },
				args: [`--profile-directory=${profileName}`],
			});
	const page = context.pages()[0] || (await context.newPage());

	try {
		if (useCdp) {
			console.log(`Attaching to existing Chrome over CDP: ${cdpUrl}`);
		} else {
			console.log(`Opening Facebook in headed mode with dedicated profile: ${profileDir}`);
		}
		console.log("Sign into Facebook in the browser window if needed.");
		console.log(`Land on the target page and make sure you can see an authenticated composer: ${targetUrl}`);

		await page.goto(targetUrl, {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});

		while (true) {
			await rl.question("Press Enter once Facebook is fully signed in and ready...");
			await page.waitForTimeout(1000);
			const currentUrl = page.url();
			const surface = await page.evaluate(() => {
				const bodyText = String(document.body?.innerText || "").replace(/\s+/g, " ").trim();
				return {
					url: location.href,
					title: document.title,
					hasPassword: Boolean(document.querySelector('input[type="password"], input[name="pass"], input[id="pass"]')),
					hasComposer:
						Boolean(document.querySelector("div[role=\"button\"][aria-label*=\"What's on your mind\"], div[role=\"dialog\"] [contenteditable=\"true\"], div[contenteditable=\"true\"], textarea")) ||
						/what's on your mind|create post|write something/i.test(bodyText),
				};
			});
			if (!surface.hasPassword && surface.hasComposer) {
				console.log(`Saved Facebook session in profile: ${profileDir}`);
				console.log(`Current URL: ${currentUrl}`);
				return;
			}
			console.log(`Facebook still does not look ready. URL: ${currentUrl}`);
			console.log(JSON.stringify(surface, null, 2));
			console.log("Finish the login/profile switch in the browser, then press Enter again.");
		}
	} finally {
		rl.close();
		if (!useCdp) {
			await context.close().catch(() => {});
		}
	}
}

main().catch((error) => {
	console.error(error?.stack || error?.message || String(error));
	process.exit(1);
});
