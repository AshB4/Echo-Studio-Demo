import "dotenv/config";
import path from "path";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { mkdir } from "fs/promises";
import { chromium } from "playwright";

const BACKEND_ROOT = process.cwd();
const DEFAULT_PROFILE_DIR = path.join(BACKEND_ROOT, "config", "kofi-chrome-profile");

function boolFromEnv(name, fallback = false) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function envAny(...names) {
	for (const name of names) {
		const value = process.env[name];
		if (value) return value;
	}
	return "";
}

async function connectViaCdp(cdpUrl) {
	const browser = await chromium.connectOverCDP(cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(`Ko-fi CDP connected to ${cdpUrl}, but no browser context was available`);
	}
	return { browser, context };
}

async function clickFirst(page, selectors, timeout = 4000) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout });
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function fillFirst(page, selectors, value, timeout = 4000) {
	if (!value) return null;
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.fill(value, { timeout });
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function ensureLoginPage(page) {
	await page.goto("https://ko-fi.com/", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await page.waitForTimeout(1000);

	const loginLink = await clickFirst(page, [
		'a[href="/account/login"]:has-text("Log in")',
		'a[href*="/account/login"]:has-text("Log in")',
		'a:has-text("Log in")',
	]);

	if (loginLink) {
		return loginLink;
	}

	await page.goto("https://ko-fi.com/account/login", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	return "direct:/account/login";
}

async function tryAutofillCredentials(page) {
	const email = envAny("KOFI_LOGIN_EMAIL", "KO_FI_LOGIN_EMAIL", "KOFI_EMAIL", "KO_FI_EMAIL");
	const password = envAny(
		"KOFI_LOGIN_PASSWORD",
		"KO_FI_LOGIN_PASSWORD",
		"KOFI_PASSWORD",
		"KO_FI_PASSWORD",
	);
	if (!email || !password) {
		return null;
	}

	const emailSelector = await fillFirst(page, [
		'input[type="email"]',
		'input[name="email"]',
		'input[id*="email" i]',
	], email);
	const passwordSelector = await fillFirst(page, [
		'input[type="password"]',
		'input[name="password"]',
		'input[id*="password" i]',
	], password);

	if (!emailSelector || !passwordSelector) {
		return null;
	}

	const submitSelector = await clickFirst(page, [
		'#formSubmitButton',
		'input#formSubmitButton',
		'input[value="Logging in..."]',
		'button[type="submit"]',
	], 5000);

	return submitSelector ? { emailSelector, passwordSelector, submitSelector } : null;
}

async function main() {
	const rl = readline.createInterface({ input, output });
	const profileDir = process.env.KOFI_CHROME_USER_DATA_DIR || DEFAULT_PROFILE_DIR;
	const profileName = process.env.KOFI_CHROME_PROFILE_DIRECTORY || "Default";
	const channel = process.env.KOFI_BROWSER_CHANNEL || "chrome";
	const executablePath = process.env.KOFI_EXECUTABLE_PATH || undefined;
	const headless = boolFromEnv("KOFI_HEADLESS", false);
	const useCdp = boolFromEnv("KOFI_USE_CDP", false);
	const cdpUrl = process.env.KOFI_CDP_URL || "http://127.0.0.1:9222";

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
			console.log(`Opening Ko-fi in headed mode with dedicated profile: ${profileDir}`);
		}
		console.log("Use the Google button manually in the browser window, or let the script autofill Ko-fi credentials if they exist in env.");
		console.log("When you are clearly signed in and can reach the Ko-fi manage/posts page, come back here.");

		const loginEntry = await ensureLoginPage(page);
		console.log(`Ko-fi login entry: ${loginEntry}`);

		const autofillResult = await tryAutofillCredentials(page);
		if (autofillResult) {
			console.log(`Ko-fi credentials autofilled via ${autofillResult.emailSelector} / ${autofillResult.passwordSelector}`);
		} else {
			console.log("No Ko-fi credential autofill used. Click the Google button or log in manually.");
		}

		while (true) {
			await rl.question("Press Enter once Ko-fi is fully signed in...");
			await page.waitForTimeout(1000);
			const currentUrl = page.url();
			if (/ko-fi\.com\/manage\/posts/i.test(currentUrl)) {
				console.log(`Saved Ko-fi session in profile: ${profileDir}`);
				console.log(`Current URL: ${currentUrl}`);
				return;
			}
			console.log(`Still not on the manage/posts page. Current URL: ${currentUrl}`);
			console.log("Finish the Google sign-in flow in the browser, then press Enter again.");
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
