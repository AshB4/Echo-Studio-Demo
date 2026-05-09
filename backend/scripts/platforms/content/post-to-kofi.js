import "dotenv/config";
import os from "os";
import fs from "fs";
import path from "path";
import { copyFile, lstat, mkdir, readdir } from "fs/promises";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { sendPostPunkTelegramAlert } from "../../../utils/telegramAlerts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../../..");
const DEFAULT_PROFILE_DIR = path.join(BACKEND_ROOT, "config", "kofi-chrome-profile");
const DEFAULT_CLONED_PROFILE_DIR = path.join(
	BACKEND_ROOT,
	"config",
	"kofi-chrome-profile-clone",
);
const DEBUG_DIR = path.join(BACKEND_ROOT, "data", "platform-debug", "kofi");
const STEP_TIMEOUT_MS = Number(process.env.KOFI_STEP_TIMEOUT_MS || 15000);
const POST_SETTLE_MS = Number(process.env.KOFI_POST_SETTLE_MS || 5000);
const BLOCKED_INTENTS = ["discovery", "conversion"];

function boolFromEnv(name, fallback = false) {
	const value = process.env[name];
	if (value === undefined) return fallback;
	return !["0", "false", "off", "no"].includes(String(value).toLowerCase());
}

function defaultChromeUserDataDir() {
	if (process.platform === "darwin") {
		return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
	}
	if (process.platform === "win32") {
		return path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "User Data");
	}
	return path.join(os.homedir(), ".config", "google-chrome");
}

function resolveProfileRoot(rawValue) {
	const value = String(rawValue || "").trim();
	if (!value) return "";
	if (value === "__DEFAULT_CHROME__") {
		return defaultChromeUserDataDir();
	}
	if (value === "__KOFI_AUTOMATION_PROFILE__") {
		return DEFAULT_PROFILE_DIR;
	}
	if (path.isAbsolute(value)) return value;
	return path.join(BACKEND_ROOT, "..", value);
}

function shouldForceHeadlessForServer() {
	if (process.platform !== "linux") return false;
	const display = String(process.env.DISPLAY || "").trim();
	const waylandDisplay = String(process.env.WAYLAND_DISPLAY || "").trim();
	return !display && !waylandDisplay;
}

function logStep(step, detail = "") {
	const suffix = detail ? ` :: ${detail}` : "";
	console.log(`[kofi] ${step}${suffix}`);
}

function buildDebugStamp() {
	return new Date().toISOString().replace(/[:.]/g, "-");
}

function createDebugPaths(stamp = buildDebugStamp()) {
	const sessionDir = path.join(DEBUG_DIR, stamp);
	return {
		stamp,
		sessionDir,
		screenshotPath: path.join(sessionDir, "failure.png"),
		htmlPath: path.join(sessionDir, "failure.html"),
		surfacePath: path.join(sessionDir, "surface.json"),
		tracePath: path.join(sessionDir, "trace.zip"),
	};
}

async function notifyDirectKofiAlert(post, message) {
	if (post?.metadata?.__workerManaged) return;
	const title = String(post?.title || "untitled").trim() || "untitled";
	const result = await sendPostPunkTelegramAlert(`Ko-fi\nTitle: ${title}\n${message}`);
	logStep("telegram", JSON.stringify(result));
	return result;
}

async function withStepTimeout(label, task, timeoutMs = STEP_TIMEOUT_MS) {
	return await Promise.race([
		task(),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error(`Ko-fi step timed out: ${label}`)), timeoutMs),
		),
	]);
}

function shouldSkipTransientChromePath(filePath) {
	const name = path.basename(String(filePath || "")).toLowerCase();
	return (
		name === "singletonlock" ||
		name === "singletonsocket" ||
		name === "singletoncookie" ||
		name === "lock" ||
		name.endsWith(".lock") ||
		name.endsWith("-wal") ||
		name.endsWith("-shm") ||
		name.endsWith(".tmp")
	);
}

function isProfileSingletonLockError(error) {
	const message = String(error?.message || error || "");
	return /singletonlock|processsingleton/i.test(message);
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await mkdir(destination, { recursive: true });
	const entries = await readdir(source, { withFileTypes: true });
	for (const entry of entries) {
		const sourcePath = path.join(source, entry.name);
		const destinationPath = path.join(destination, entry.name);
		if (shouldSkipTransientChromePath(sourcePath)) continue;
		let stats;
		try {
			stats = await lstat(sourcePath);
		} catch (error) {
			if (error?.code === "ENOENT") continue;
			throw error;
		}
		if (stats.isDirectory()) {
			await copyDirectory(sourcePath, destinationPath);
			continue;
		}
		if (stats.isSymbolicLink()) continue;
		await mkdir(path.dirname(destinationPath), { recursive: true });
		await copyFile(sourcePath, destinationPath);
	}
}

function resolveConfig(account = {}) {
	const metadata = account?.metadata || {};
	const configuredHeadless = boolFromEnv("KOFI_HEADLESS", false);
	const forcedHeadless = shouldForceHeadlessForServer();
	const sourceUserDataDir =
		resolveProfileRoot(metadata.browserUserDataDir) ||
		resolveProfileRoot(process.env.KOFI_CHROME_USER_DATA_DIR) ||
		DEFAULT_PROFILE_DIR;

	return {
		useCdp: boolFromEnv("KOFI_USE_CDP", false),
		cdpUrl: process.env.KOFI_CDP_URL || "http://127.0.0.1:9222",
		channel: process.env.KOFI_BROWSER_CHANNEL || "chrome",
		executablePath: process.env.KOFI_EXECUTABLE_PATH || undefined,
		headless: configuredHeadless || forcedHeadless,
		configuredHeadless,
		forcedHeadless,
		sourceUserDataDir,
		profileDirectory:
			metadata.browserProfileDirectory ||
			process.env.KOFI_CHROME_PROFILE_DIRECTORY ||
			"Default",
		cloneEnabled:
			metadata.cloneChromeProfile ??
			boolFromEnv("KOFI_CLONE_CHROME_PROFILE", false),
		clonedUserDataDir:
			metadata.clonedBrowserUserDataDir ||
			process.env.KOFI_CLONED_CHROME_USER_DATA_DIR ||
			DEFAULT_CLONED_PROFILE_DIR,
		managePostsUrl:
			metadata.managePostsUrl ||
			process.env.KOFI_MANAGE_POSTS_URL ||
			"https://ko-fi.com/manage/posts",
		shopSetupUrl:
			metadata.shopSetupUrl ||
			process.env.KOFI_SHOP_SETUP_URL ||
			"https://ko-fi.com/shop/settings?addnewitem=true&productType=0#setup",
		keepOpenOnAuthRequired: boolFromEnv("KOFI_KEEP_OPEN_ON_AUTH_REQUIRED", true),
		keepOpenOnPostFailure: boolFromEnv("KOFI_KEEP_OPEN_ON_POST_FAILURE", true),
	};
}

async function connectViaCdp(config) {
	logStep("connect-cdp:start", config.cdpUrl);
	const browser = await chromium.connectOverCDP(config.cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(`Ko-fi CDP connected to ${config.cdpUrl}, but no browser context was available`);
	}
	logStep("connect-cdp:ready");
	return {
		context,
		cleanup: async () => {},
	};
}

async function prepareChromeProfile(config) {
	if (!config.cloneEnabled) {
		await mkdir(config.sourceUserDataDir, { recursive: true });
		return {
			launchUserDataDir: config.sourceUserDataDir,
			profileDirectory: config.profileDirectory,
			cleanup: async () => {},
		};
	}

	const sourceProfileDir = path.join(
		config.sourceUserDataDir,
		config.profileDirectory,
	);
	const sourceLocalState = path.join(config.sourceUserDataDir, "Local State");
	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`Ko-fi Chrome source profile not found: ${sourceProfileDir}`);
	}

	const cloneRootParent = path.dirname(config.clonedUserDataDir);
	const cloneRootPrefix = `${path.basename(config.clonedUserDataDir)}-`;
	await mkdir(cloneRootParent, { recursive: true });
	const clonedRoot = await fs.promises.mkdtemp(path.join(cloneRootParent, cloneRootPrefix));
	const clonedProfileDir = path.join(clonedRoot, config.profileDirectory);

	await copyDirectory(sourceProfileDir, clonedProfileDir);
	if (fs.existsSync(sourceLocalState)) {
		await copyFile(sourceLocalState, path.join(clonedRoot, "Local State"));
	}

	return {
		launchUserDataDir: clonedRoot,
		profileDirectory: config.profileDirectory,
		cleanup: async () => {
			await fs.promises.rm(clonedRoot, { recursive: true, force: true });
		},
	};
}

async function launchKofiContextWithFallback(profile, config) {
	try {
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			channel: config.channel,
			executablePath: config.executablePath,
			headless: config.headless,
			viewport: { width: 1440, height: 960 },
			args: [
				`--profile-directory=${profile.profileDirectory}`,
				"--disable-dev-shm-usage",
			],
		});
	} catch (error) {
		if (!isProfileSingletonLockError(error) || config.cloneEnabled) {
			throw error;
		}
		logStep("browser:launch:fallback", "singleton-lock-clone");
		const fallbackProfile = await prepareChromeProfile({
			...config,
			cloneEnabled: true,
		});
		profile.launchUserDataDir = fallbackProfile.launchUserDataDir;
		profile.cleanup = fallbackProfile.cleanup;
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			channel: config.channel,
			executablePath: config.executablePath,
			headless: config.headless,
			viewport: { width: 1440, height: 960 },
			args: [
				`--profile-directory=${profile.profileDirectory}`,
				"--disable-dev-shm-usage",
			],
		});
	}
}

function resolveLocalMediaPath(post = {}) {
	const mediaPath = post?.mediaPath || "";
	if (!mediaPath) return null;
	if (path.isAbsolute(mediaPath)) return mediaPath;
	const workspacePath = path.join(BACKEND_ROOT, "..", mediaPath);
	if (fs.existsSync(workspacePath)) {
		return workspacePath;
	}
	if (mediaPath.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, mediaPath.slice(1));
	}
	return path.join(BACKEND_ROOT, mediaPath);
}

export function buildKofiPostText(post = {}) {
	const title = String(post.title || "").trim();
	const body = String(post.body || "").trim();
	if (title && body) return `${title}\n\n${body}`;
	return title || body;
}

export function inferKofiMode(post = {}) {
	const explicit =
		post?.metadata?.kofiMode ||
		post?.metadata?.kofiType ||
		post?.metadata?.contentType ||
		"";
	const normalized = String(explicit).trim().toLowerCase();
	if (normalized === "product" || normalized === "shop") return "product";
	return "post";
}

export function ensureKofiContentAllowed(post = {}) {
	const mode = inferKofiMode(post);
	if (mode !== "post") {
		throw new Error(
			"Ko-fi product automation is not wired yet. Use the standard Ko-fi post flow for now.",
		);
	}

	const intents = Array.isArray(post.contentIntent)
		? post.contentIntent
		: Array.isArray(post?.metadata?.contentIntent)
			? post.metadata.contentIntent
			: [];
	const blocked = intents
		.map((value) => String(value || "").trim().toLowerCase())
		.filter((intent) => BLOCKED_INTENTS.includes(intent));
	if (blocked.length) {
		throw new Error(
			`Ko-fi rejects posts with intent: ${blocked.join(", ")}. Keep Ko-fi relationship-first.`,
		);
	}
}

function warnOnKofiTone(post = {}) {
	const text = `${post.title || ""} ${post.body || ""}`;
	const badPatterns = [/limited time/i, /buy now/i, /don't miss/i, /act fast/i];
	const found = badPatterns.filter((pattern) => pattern.test(text));
	if (found.length) {
		console.warn(
			"Ko-fi warning: post reads hypey/spammy. Consider softening the tone before you flood supporters with funnel sludge.",
		);
	}
}

function pageLooksLikeAuthRequired(page) {
	const url = String(page?.url?.() || "");
	return (
		/ko-fi\.com\/(login|signin|register)/i.test(url) ||
		/ko-fi\.com\/home\/coffeeshop\?login=true/i.test(url)
	);
}

async function clickFirst(page, selectors, timeout = 4000) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => true))) {
				await locator.click({ timeout });
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function findFirstVisibleSelector(page, selectors) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => true))) {
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function openComposer(page, config) {
	await page.goto(config.managePostsUrl, {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});
	await page.waitForTimeout(1200);

	const existingTextBox = page.locator("#postUpdateTextBox").first();
	if ((await existingTextBox.count()) > 0) {
		return "#postUpdateTextBox";
	}

	const createButton = await clickFirst(page, [
		'button:has-text("Create")',
		'button.dropdown-toggle:has-text("Create")',
		'button.kfds-c-btn-primary-light:has-text("Create")',
	]);
	if (!createButton) {
		throw new Error("Ko-fi create button not found");
	}
	logStep("composer:create", createButton);
	await page.waitForTimeout(600);

	const postSomething = await clickFirst(page, [
		'a.creator-dropdown-list:has-text("Post something")',
		'a:has-text("Post something")',
	]);
	if (!postSomething) {
		throw new Error("Ko-fi 'Post something' action not found");
	}
	logStep("composer:menu", postSomething);

	await page.waitForSelector("#postUpdateTextBox", { timeout: 10000 });
	return "#postUpdateTextBox";
}

async function fillComposer(page, text) {
	const locator = page.locator("#postUpdateTextBox").first();
	await locator.click({ timeout: 4000 });
	await locator.fill(text, { timeout: 4000 });
	return "#postUpdateTextBox";
}

async function attachImage(page, filePath) {
	const triggerSelector = await findFirstVisibleSelector(page, [
		'a.js-required-image-upload-vue-app:has-text("Image")',
		'a:has-text("Image")',
	]);

	const directInputSelectors = [
		'input[type="file"]',
		'input[type="file"][accept*="image"]',
	];

	if (triggerSelector) {
		try {
			const chooserPromise = page.waitForEvent("filechooser", { timeout: 4000 });
			await page.locator(triggerSelector).first().click({ timeout: 4000 });
			const chooser = await chooserPromise;
			await chooser.setFiles(filePath);
			await page.waitForTimeout(1500);
			return `filechooser:${triggerSelector}`;
		} catch {
			// fall through to direct file inputs
		}
	}

	for (const selector of directInputSelectors) {
		try {
			const locator = page.locator(selector).last();
			if ((await locator.count()) > 0) {
				await locator.setInputFiles(filePath, { timeout: 4000 });
				await page.waitForTimeout(1500);
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function publishPost(page) {
	await page.waitForFunction(() => {
		const button = document.querySelector("#postUpdateButton");
		if (!button) return false;
		return !button.classList.contains("disabled") && !button.hasAttribute("disabled");
	}, { timeout: 12000 });

	const button = page.locator("#postUpdateButton").first();
	await button.click({ timeout: 4000 });

	await Promise.race([
		page.waitForFunction(() => {
			const modal = document.querySelector("#addContentMenuModal");
			if (!modal) return true;
			return !modal.classList.contains("show");
		}, { timeout: 12000 }),
		page.waitForLoadState("networkidle", { timeout: 12000 }),
	]);

	await page.waitForTimeout(POST_SETTLE_MS);
}

async function extractLatestPostUrl(page) {
	try {
		return await page.evaluate(() => {
			const candidates = Array.from(document.querySelectorAll('a[href*="/post/"]'))
				.map((anchor) => anchor.href)
				.filter(Boolean);
			return candidates[0] || null;
		});
	} catch {
		return null;
	}
}

async function captureFailureArtifacts(page, label = "failure") {
	const paths = createDebugPaths();
	await mkdir(paths.sessionDir, { recursive: true });
	const screenshotPath =
		label === "failure"
			? paths.screenshotPath
			: path.join(paths.sessionDir, `${label}.png`);
	try {
		await page.screenshot({ path: screenshotPath, fullPage: true });
		const html = await page.content().catch(() => "");
		if (html) {
			await fs.promises.writeFile(paths.htmlPath, html, "utf8");
		}
		const surface = await page.evaluate(() => ({
			url: location.href,
			title: document.title,
			body: String(document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 2500),
			buttons: Array.from(document.querySelectorAll("button,a"))
				.map((el) => ({
					text: String(el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200),
					href: String(el.getAttribute?.("href") || "").slice(0, 500),
					id: String(el.id || ""),
					className: String(el.className || "").slice(0, 300),
				}))
				.filter((item) => item.text || item.href || item.id)
				.slice(0, 80),
		})).catch(() => null);
		if (surface) {
			await fs.promises.writeFile(paths.surfacePath, JSON.stringify(surface, null, 2), "utf8");
		}
		return {
			sessionDir: paths.sessionDir,
			screenshotPath,
			htmlPath: fs.existsSync(paths.htmlPath) ? paths.htmlPath : null,
			surfacePath: fs.existsSync(paths.surfacePath) ? paths.surfacePath : null,
			tracePath: paths.tracePath,
		};
	} catch {
		return null;
	}
}

export default async function postToKofi(post = {}, { account = {} } = {}) {
	ensureKofiContentAllowed(post);
	warnOnKofiTone(post);

	const config = resolveConfig(account);
	const profile = config.useCdp
		? { cleanup: async () => {} }
		: await prepareChromeProfile(config);
	const context = config.useCdp
		? (await connectViaCdp(config)).context
		: await launchKofiContextWithFallback(profile, config);
	const tracePaths = createDebugPaths();

	let shouldClose = true;

	try {
		const page = context.pages()[0] || (await context.newPage());
		logStep("browser:ready", config.headless ? "headless" : "headed");
		await mkdir(tracePaths.sessionDir, { recursive: true });
		await context.tracing.start({
			screenshots: true,
			snapshots: true,
			sources: true,
		}).catch(() => {});

		await withStepTimeout("open-composer", () => openComposer(page, config), 30000);

		if (pageLooksLikeAuthRequired(page)) {
			if (config.keepOpenOnAuthRequired) shouldClose = false;
			throw new Error("Ko-fi login required in the automation browser");
		}

		const composedText = buildKofiPostText(post);
		if (!composedText) {
			throw new Error("Ko-fi requires post text");
		}

		const filledSelector = await withStepTimeout(
			"fill-composer",
			() => fillComposer(page, composedText),
			12000,
		);
		logStep("composer:filled", filledSelector);

		const mediaPath = resolveLocalMediaPath(post);
		if (mediaPath) {
			if (!fs.existsSync(mediaPath)) {
				throw new Error(`Ko-fi media not found: ${mediaPath}`);
			}
			const uploadSelector = await withStepTimeout(
				"attach-image",
				() => attachImage(page, mediaPath),
				15000,
			);
			if (!uploadSelector) {
				throw new Error("Ko-fi image upload control not found");
			}
			logStep("composer:image", uploadSelector);
		}

		await withStepTimeout("publish-post", () => publishPost(page), 20000);
		const url = (await extractLatestPostUrl(page)) || page.url();
		logStep("post:done", url);
		await notifyDirectKofiAlert(
			post,
			`Post succeeded.\nURL: ${url}`,
		);

		return {
			success: true,
			url,
			via: "playwright",
			mode: "post",
		};
	} catch (error) {
		const page = context.pages()[0];
		let traceSaved = false;
		await context.tracing.stop({ path: tracePaths.tracePath }).then(() => {
			traceSaved = true;
		}).catch(() => {});
		const artifact = page ? await captureFailureArtifacts(page) : null;
		if (artifact) {
			logStep("artifact", JSON.stringify(artifact));
		}
		if (traceSaved) {
			logStep("trace", tracePaths.tracePath);
		}
		await notifyDirectKofiAlert(
			post,
			`Post failed.\nError: ${error?.message || "Unknown Ko-fi error"}${
				artifact?.sessionDir ? `\nDebug dir: ${artifact.sessionDir}` : ""
			}${traceSaved ? `\nTrace: ${tracePaths.tracePath}` : ""}`,
		);
		if (config.keepOpenOnPostFailure && !config.headless) {
			shouldClose = false;
		}
		throw error;
	} finally {
		await context.tracing.stop().catch(() => {});
		if (shouldClose) {
			if (!config.useCdp) {
				await context.close().catch(() => {});
			}
			await profile.cleanup().catch(() => {});
		}
	}
}
