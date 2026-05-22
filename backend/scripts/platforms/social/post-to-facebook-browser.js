/** @format */

import "dotenv/config";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { copyFile, lstat, mkdir, readdir } from "fs/promises";
import { chromium } from "playwright";
import { getAccount } from "../../../utils/accountStore.mjs";
import { createBrowserDebugRecorder } from "../../../utils/browserDebugRecorder.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-load .env with correct path to ensure it's loaded
try {
  const dotenv = require("dotenv");
  dotenv.config({ path: path.join(__dirname, "../../../.env") });
} catch (e) {}

const BACKEND_ROOT = path.join(__dirname, "../../..");
const DEBUG_DIR = path.join(BACKEND_ROOT, "debug", "facebook");
const DEFAULT_CLONED_PROFILE_DIR = path.join(
	BACKEND_ROOT,
	"config",
	"facebook-chrome-profile",
);
const STEP_TIMEOUT_MS = Number(process.env.FACEBOOK_BROWSER_STEP_TIMEOUT_MS || 15000);
const CLEANUP_TIMEOUT_MS = Number(process.env.FACEBOOK_BROWSER_CLEANUP_TIMEOUT_MS || 12000);
const POST_SETTLE_MS = Number(process.env.FACEBOOK_POST_SETTLE_MS || 8000);
const FACEBOOK_GRAPH_VERSION = "v18.0";

function boolFromEnv(name, fallback = true) {
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

function shouldForceHeadlessForServer() {
	if (process.platform !== "linux") return false;
	const display = String(process.env.DISPLAY || "").trim();
	const waylandDisplay = String(process.env.WAYLAND_DISPLAY || "").trim();
	return !display && !waylandDisplay;
}

function resolveProfileConfig(account = {}) {
	const metadata = account?.metadata || {};
	const configuredHeadless = boolFromEnv("FACEBOOK_HEADLESS", false);
	const forcedHeadless = shouldForceHeadlessForServer();
	const sourceUserDataDir =
		metadata.browserUserDataDir === "__DEFAULT_CHROME__"
			? defaultChromeUserDataDir()
			: metadata.browserUserDataDir === "__FACEBOOK_AUTOMATION_PROFILE__"
				? path.join(BACKEND_ROOT, "data", "facebook-automation-profile")
				: metadata.browserUserDataDir ||
				process.env.FACEBOOK_CHROME_USER_DATA_DIR ||
				DEFAULT_CLONED_PROFILE_DIR;
	return {
		useCdp: boolFromEnv("FACEBOOK_USE_CDP", false),
		cdpUrl: process.env.FACEBOOK_CDP_URL || "http://127.0.0.1:9222",
		channel: process.env.FACEBOOK_BROWSER_CHANNEL || "chrome",
		executablePath: process.env.FACEBOOK_EXECUTABLE_PATH || undefined,
		headless: configuredHeadless || forcedHeadless,
		configuredHeadless,
		forcedHeadless,
		sourceUserDataDir,
		profileDirectory:
			metadata.browserProfileDirectory ||
			process.env.FACEBOOK_CHROME_PROFILE_DIRECTORY ||
			"Default",
		cloneEnabled:
			metadata.cloneChromeProfile ??
			boolFromEnv("FACEBOOK_CLONE_CHROME_PROFILE", false),
		clonedUserDataDir:
			metadata.clonedBrowserUserDataDir ||
			process.env.FACEBOOK_CLONED_CHROME_USER_DATA_DIR ||
			DEFAULT_CLONED_PROFILE_DIR,
		keepOpenOnAuthRequired: boolFromEnv("FACEBOOK_KEEP_OPEN_ON_AUTH_REQUIRED", true),
		keepOpenOnPostFailure: boolFromEnv("FACEBOOK_KEEP_OPEN_ON_POST_FAILURE", true),
	};
}

function logStep(step, detail = "") {
	const suffix = detail ? ` :: ${detail}` : "";
	console.log(`[fb-browser] ${step}${suffix}`);
}

function shouldUseManualShareMode() {
	return boolFromEnv("FACEBOOK_MANUAL_SHARE_MODE", false);
}

function shouldSkipExistingFeedCheck() {
	return boolFromEnv("FACEBOOK_SKIP_EXISTING_CHECK", true);
}

function getFacebookPostText(post) {
	return String(post?.body || post?.title || "").trim();
}

function createDebugRecorder(enabled) {
	return createBrowserDebugRecorder({
		enabled,
		debugDir: DEBUG_DIR,
		logPrefix: "FACEBOOK_DEBUG",
	});
}

async function dumpFacebookSurface(page, label) {
	try {
		const surface = await page.evaluate(() => {
			const pick = (el) => {
				const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
				const aria = String(el.getAttribute?.("aria-label") || "").replace(/\s+/g, " ").trim();
				return {
					tag: String(el.tagName || "").toLowerCase(),
					role: String(el.getAttribute?.("role") || ""),
					text: text.slice(0, 120),
					aria: aria.slice(0, 120),
				};
			};
			const buttons = Array.from(
				document.querySelectorAll('div[role="button"], button, a[role="button"], [aria-label]'),
			)
				.filter((el) => {
					const rect = el.getBoundingClientRect();
					const style = window.getComputedStyle(el);
					return (
						rect.width > 0 &&
						rect.height > 0 &&
						style.visibility !== "hidden" &&
						style.display !== "none"
					);
				})
				.slice(0, 40)
				.map(pick);
			return {
				title: document.title,
				url: location.href,
				bodyText: String(document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1200),
				buttons,
			};
		});
		logStep(`surface:${label}`, JSON.stringify(surface));
		return surface;
	} catch (error) {
		logStep("surface:dump-failed", `${label}: ${error?.message || String(error)}`);
		return null;
	}
}

function shouldFallbackToChromium() {
	return !["0", "false", "off", "no"].includes(
		String(process.env.FACEBOOK_FALLBACK_TO_CHROMIUM || "false").toLowerCase(),
	);
}

function isBrowserLaunchAbortError(error) {
	const message = String(error?.message || error || "");
	return (
		/browsertype\.launchpersistentcontext/i.test(message) &&
		(/signal=sigabrt/i.test(message) ||
			/abort trap/i.test(message) ||
			/hiservices/i.test(message) ||
			/crashpad/i.test(message) ||
			/target page, context or browser has been closed/i.test(message))
	);
}

function isProfileSingletonLockError(error) {
	const message = String(error?.message || error || "");
	return /singletonlock|processsingleton/i.test(message);
}

function shouldSkipTransientChromePath(filePath) {
	const name = path.basename(String(filePath || "")).toLowerCase();
	return (
		name === "singletonlock" ||
		name === "singletonsocket" ||
		name === "singletoncookie" ||
		name.endsWith("-wal") ||
		name.endsWith("-shm") ||
		name.endsWith(".tmp") ||
		name === "lock" ||
		name.endsWith(".lock")
	);
}

async function launchFacebookContextWithFallback(profile, config) {
	try {
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			channel: config.channel,
			executablePath: config.executablePath,
			headless: config.headless,
			args: [`--profile-directory=${profile.profileDirectory}`],
			viewport: { width: 1440, height: 960 },
		});
	} catch (error) {
		if (isProfileSingletonLockError(error)) {
			const fallbackProfile = await prepareChromeProfile({
				...config,
				cloneEnabled: true,
			});
			profile.launchUserDataDir = fallbackProfile.launchUserDataDir;
			profile.cleanup = fallbackProfile.cleanup;
			logStep("browser:launch:fallback", "singleton-lock-clone");
			return await chromium.launchPersistentContext(profile.launchUserDataDir, {
				channel: config.channel,
				executablePath: config.executablePath,
				headless: config.headless,
				args: [`--profile-directory=${profile.profileDirectory}`],
				viewport: { width: 1440, height: 960 },
			});
		}
		if (
			!shouldFallbackToChromium() ||
			String(config.channel || "").toLowerCase() !== "chrome" ||
			!isBrowserLaunchAbortError(error)
		) {
			throw error;
		}
		logStep("browser:launch:fallback", "chromium");
		return await chromium.launchPersistentContext(profile.launchUserDataDir, {
			headless: config.headless,
			args: [`--profile-directory=${profile.profileDirectory}`],
			viewport: { width: 1440, height: 960 },
		});
	}
}

async function withStepTimeout(label, task, timeoutMs = STEP_TIMEOUT_MS) {
	return await Promise.race([
		task(),
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Facebook browser step timed out: ${label}`)),
				timeoutMs,
			),
		),
	]);
}

async function settleWithTimeout(label, taskPromise, timeoutMs = CLEANUP_TIMEOUT_MS) {
	try {
		await Promise.race([
			taskPromise,
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error(`Facebook browser cleanup timed out: ${label}`)),
					timeoutMs,
				),
			),
		]);
	} catch (error) {
		logStep("cleanup-warning", `${label}: ${error?.message || String(error)}`);
	}
}

async function connectViaCdp(config) {
	logStep("connect-cdp:start", config.cdpUrl);
	const browser = await chromium.connectOverCDP(config.cdpUrl);
	const context = browser.contexts()[0];
	if (!context) {
		throw new Error(
			`Facebook CDP connected to ${config.cdpUrl}, but no browser context was available`,
		);
	}
	logStep("connect-cdp:ready");

	return {
		context,
		cleanup: async () => {},
	};
}

async function copyDirectory(source, destination) {
	await mkdir(path.dirname(destination), { recursive: true });
	await fs.promises.rm(destination, { recursive: true, force: true });
	await mkdir(destination, { recursive: true });
	const entries = await readdir(source, { withFileTypes: true });
	for (const entry of entries) {
		const sourcePath = path.join(source, entry.name);
		const destinationPath = path.join(destination, entry.name);
		if (shouldSkipTransientChromePath(sourcePath)) {
			continue;
		}
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
		if (stats.isSymbolicLink()) {
			continue;
		}
		try {
			await mkdir(path.dirname(destinationPath), { recursive: true });
			await copyFile(sourcePath, destinationPath);
		} catch (error) {
			if (error?.code === "ENOENT") continue;
			throw error;
		}
	}
}

async function prepareChromeProfile(config) {
	logStep(
		"profile:prepare",
		config.cloneEnabled
			? `${config.sourceUserDataDir} -> ${config.clonedUserDataDir}`
			: config.sourceUserDataDir,
	);
	if (!config.cloneEnabled) {
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
	const cloneRootParent = path.dirname(config.clonedUserDataDir);
	const cloneRootPrefix = `${path.basename(config.clonedUserDataDir)}-`;
	await mkdir(cloneRootParent, { recursive: true });
	const clonedRoot = await fs.promises.mkdtemp(
		path.join(cloneRootParent, cloneRootPrefix),
	);
	const clonedProfileDir = path.join(clonedRoot, config.profileDirectory);

	if (!fs.existsSync(sourceProfileDir)) {
		throw new Error(`Facebook Chrome source profile not found: ${sourceProfileDir}`);
	}

	await copyDirectory(sourceProfileDir, clonedProfileDir);
	if (fs.existsSync(sourceLocalState)) {
		await fs.promises.copyFile(sourceLocalState, path.join(clonedRoot, "Local State"));
	}
	logStep("profile:ready", clonedRoot);

	return {
		launchUserDataDir: clonedRoot,
		profileDirectory: config.profileDirectory,
		cleanup: async () => {
			await fs.promises.rm(clonedRoot, { recursive: true, force: true });
		},
	};
}

function resolveLocalMediaPath(post) {
	const mediaPath = post?.mediaPath || "";
	if (!mediaPath) return null;
	if (/^https?:\/\//i.test(mediaPath)) return mediaPath;
	const workspaceRoot = path.join(BACKEND_ROOT, "..");
	const candidatePaths = [];
	if (path.isAbsolute(mediaPath)) {
		candidatePaths.push(mediaPath);
		const frontendIndex = mediaPath.lastIndexOf("/frontend/");
		if (frontendIndex >= 0) {
			candidatePaths.push(path.join(workspaceRoot, mediaPath.slice(frontendIndex + 1)));
		}
		const assetsIndex = mediaPath.lastIndexOf("/assets/");
		if (assetsIndex >= 0) {
			candidatePaths.push(
				path.join(workspaceRoot, "frontend", mediaPath.slice(assetsIndex + 1)),
			);
		}
	} else {
		candidatePaths.push(path.join(workspaceRoot, mediaPath));
		if (mediaPath.startsWith("backend/frontend/")) {
			candidatePaths.push(
				path.join(workspaceRoot, mediaPath.replace(/^backend\/frontend\//, "frontend/")),
			);
		}
	}
	for (const candidate of candidatePaths) {
		if (candidate && fs.existsSync(candidate)) return candidate;
	}
	const assetBasename = path.basename(mediaPath);
	if (assetBasename) {
		const assetSearchRoots = [
			path.join(workspaceRoot, "frontend", "assets"),
			path.join(workspaceRoot, "backend", "media"),
		];
		const stack = [...assetSearchRoots];
		while (stack.length > 0) {
			const current = stack.pop();
			if (!current || !fs.existsSync(current)) continue;
			let entries = [];
			try {
				entries = fs.readdirSync(current, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				const fullPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					stack.push(fullPath);
					continue;
				}
				if (entry.isFile() && entry.name === assetBasename) {
					return fullPath;
				}
			}
		}
	}
	const workspacePath = path.join(BACKEND_ROOT, "..", mediaPath);
	if (fs.existsSync(workspacePath)) {
		return workspacePath;
	}
	if (mediaPath.startsWith("/media/")) {
		return path.join(BACKEND_ROOT, mediaPath.slice(1));
	}
	return path.join(BACKEND_ROOT, mediaPath);
}

async function downloadRemoteMediaToTemp(mediaUrl) {
	const url = new URL(mediaUrl);
	const extFromPath = path.extname(url.pathname) || ".jpg";
	const safeExt = /^\.[a-z0-9]+$/i.test(extFromPath) ? extFromPath : ".jpg";
	const tempPath = path.join(
		os.tmpdir(),
		`postpunk-facebook-${Date.now()}${safeExt}`,
	);
	const response = await fetch(mediaUrl);
	if (!response.ok) {
		throw new Error(
			`Failed to download remote media (${response.status} ${response.statusText})`,
		);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	await fs.promises.writeFile(tempPath, buffer);
	return tempPath;
}

function resolveTargetUrl(account = {}) {
	const accountId = String(account?.id || "").toLowerCase();
	if (accountId === "fb-main-page") {
		return (
			account?.metadata?.profileUrl ||
			"https://www.facebook.com/SanguineQueen/"
		);
	}
	const explicit =
		account?.metadata?.pageUrl ||
		account?.metadata?.profileUrl ||
		process.env.FACEBOOK_TARGET_URL ||
		"";
	if (explicit) return explicit;

	const pageId = account?.metadata?.pageId || process.env.FACEBOOK_PAGE_ID || "";
	if (pageId) return `https://www.facebook.com/${pageId}`;
	return "https://www.facebook.com/me";
}

function normalizeSnippet(text) {
	return String(text || "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 120);
}

function buildVerificationSnippets(value) {
	const candidate =
		value && typeof value === "object"
			? [
				value?.title,
				String(value?.body || "").split("\n").filter(Boolean)[0] || "",
				String(value?.body || "").split(/[.!?]/).filter(Boolean)[0] || "",
				value?.body,
			]
			: [value];
	return Array.from(
		new Set(
			candidate
				.map((item) => normalizeSnippet(item))
				.filter((item) => item.length >= 16),
		),
	).slice(0, 4);
}

async function extractPublishedPostPermalink(page, value) {
	const snippets = buildVerificationSnippets(value);
	if (!snippets.length) return "";
	try {
		const href = await page.evaluate((targetSnippets) => {
			const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
			const candidates = Array.from(document.querySelectorAll('div[role="article"]'));
			const article = candidates.find((node) =>
				targetSnippets.some((snippet) =>
					normalize(node.innerText || "").includes(snippet),
				),
			);
			if (!article) return "";
			const links = Array.from(article.querySelectorAll("a[href]"))
				.map((node) => node.getAttribute("href") || "")
				.filter((href) => /\/posts\/|\/permalink\/|story\.php|\/photos\//i.test(href));
			return links[0] || "";
		}, snippets);
		if (!href) return "";
		return new URL(href, page.url()).toString();
	} catch (error) {
		logStep("share:permalink-failed", error?.message || String(error));
		return "";
	}
}

async function shareLinkToFacebookFeed(account, message, link) {
	const accessToken = String(account?.credentials?.accessToken || "").trim();
	const pageId = String(account?.metadata?.pageId || "").trim();
	if (!accessToken || !pageId || !link) {
		throw new Error("Share target is missing pageId, access token, or permalink");
	}

	const body = new URLSearchParams();
	body.set("message", String(message || "").trim());
	body.set("link", String(link).trim());
	body.set("access_token", accessToken);

	const response = await fetch(
		`https://graph.facebook.com/${FACEBOOK_GRAPH_VERSION}/${pageId}/feed`,
		{
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
			},
			body,
		},
	);
	const data = await response.json().catch(() => ({}));
	if (!response.ok || data?.error) {
		throw new Error(data?.error?.message || `HTTP ${response.status}`);
	}
	return {
		type: "feed-share",
		postId: data?.id || null,
	};
}

async function clickShareButtonForPost(page, text) {
	const snippet = normalizeSnippet(text);
	if (!snippet) return null;

	try {
		const result = await page.evaluate((targetSnippet) => {
			const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
			const isVisible = (el) => {
				if (!el) return false;
				const style = window.getComputedStyle(el);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};

			const articles = Array.from(document.querySelectorAll('div[role="article"]'));
			const article = articles.find((node) =>
				normalize(node.innerText || "").includes(targetSnippet),
			);
			if (!article) return null;

			const candidates = Array.from(
				article.querySelectorAll('div[role="button"], button, a[role="button"], span'),
			);
			const target = candidates.find((node) => {
				const text = normalize(node.textContent || "");
				const aria = normalize(node.getAttribute?.("aria-label") || "");
				return (
					isVisible(node) &&
					(text === "Share" ||
						aria === "Share" ||
						text === "Send this to friends or post it on your profile." ||
						aria === "Send this to friends or post it on your profile.")
				);
			});
			if (!target) return null;
			let clickable = target;
			while (clickable && clickable !== document.body) {
				const role = String(clickable.getAttribute?.("role") || "");
				if (
					clickable instanceof HTMLElement &&
					isVisible(clickable) &&
					(role === "button" || clickable.tagName === "BUTTON" || clickable.tagName === "A")
				) {
					const rect = clickable.getBoundingClientRect();
					return {
						x: Math.round(rect.left + rect.width / 2),
						y: Math.round(rect.top + rect.height / 2),
						label: normalize(clickable.textContent || clickable.getAttribute?.("aria-label") || "Share"),
					};
				}
				clickable = clickable.parentElement;
			}
			const rect = target.getBoundingClientRect();
			return {
				x: Math.round(rect.left + rect.width / 2),
				y: Math.round(rect.top + rect.height / 2),
				label: normalize(target.textContent || target.getAttribute?.("aria-label") || "Share"),
			};
		}, snippet);

		if (!result?.x || !result?.y) return null;
		await page.mouse.click(result.x, result.y, { delay: 40 });
		return `share-mouse:${result.label || "Share"}`;
	} catch (error) {
		logStep("share:ui-click-failed", error?.message || String(error));
		return null;
	}
}

async function clickShareButtonInFeed(page) {
	try {
		await dismissInterruptivePopups(page);
		await page.mouse.wheel(0, 1200).catch(() => {});
		await page.waitForTimeout(800);

		const selectors = [
			'div[data-ad-rendering-role="share_button"]',
			'div[data-ad-rendering-role="share_button"] span',
			'div[role="button"] div[data-ad-rendering-role="share_button"]',
			'div[role="button"]:has(span:has-text("Share"))',
			'div[role="button"]:has-text("Share")',
			'span:has-text("Share")',
		];

		for (const selector of selectors) {
			try {
				const locator = page.locator(selector).first();
				const count = await locator.count().catch(() => 0);
				if (count > 0) {
					await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
					await locator.click({ timeout: 4000, force: true });
					logStep("share:feed-click", selector);
					return selector;
				}
			} catch {
				// continue
			}
		}

		const articleShare = await page.evaluate(() => {
			const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
			const isVisible = (el) => {
				if (!el) return false;
				const style = window.getComputedStyle(el);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const articles = Array.from(document.querySelectorAll('div[role="article"]'));
			for (const article of articles) {
				const shareCandidates = Array.from(
					article.querySelectorAll('[data-ad-rendering-role="share_button"], div[role="button"], button, span'),
				).filter((node) => {
					const text = normalize(node.textContent || "");
					const aria = normalize(node.getAttribute?.("aria-label") || "");
					return (
						isVisible(node) &&
						(text === "Share" ||
							aria === "Share" ||
							text.includes("Share") ||
							aria.includes("Share"))
					);
				});
				const target = shareCandidates[0];
				if (!target) continue;
				let clickable = target;
				while (clickable && clickable !== document.body) {
					const role = String(clickable.getAttribute?.("role") || "");
					if (
						clickable instanceof HTMLElement &&
						isVisible(clickable) &&
						(role === "button" || clickable.tagName === "BUTTON" || clickable.tagName === "A")
					) {
						const rect = clickable.getBoundingClientRect();
						return {
							x: Math.round(rect.left + rect.width / 2),
							y: Math.round(rect.top + rect.height / 2),
							label: normalize(clickable.textContent || clickable.getAttribute?.("aria-label") || "Share"),
						};
					}
					clickable = clickable.parentElement;
				}
			}
			return null;
		});

		if (articleShare?.x && articleShare?.y) {
			await page.mouse.click(articleShare.x, articleShare.y, { delay: 40 });
			logStep("share:feed-mouse", articleShare.label || "Share");
			return `mouse:${articleShare.label || "Share"}`;
		}
	} catch (error) {
		logStep("share:feed-click-failed", error?.message || String(error));
	}
	return null;
}

async function confirmUiShare(page) {
	for (let attempt = 0; attempt < 12; attempt += 1) {
		await dismissInterruptivePopups(page);

		const direct = await clickFirst(page, [
			'div[role="dialog"] [data-ad-rendering-role="share_button"]',
			'div[role="dialog"] div[data-ad-rendering-role="share_button"]',
			'div[role="dialog"] div[role="button"][data-ad-rendering-role="share_button"]',
			'div[role="dialog"] div[role="button"]:has(span:has-text("Share"))',
			'div[role="dialog"] div:has(span:has-text("Share"))',
			'div[role="dialog"] span:has-text("Share")',
			'div[role="menuitem"]:has-text("Share now")',
			'div[role="button"]:has-text("Share now")',
			'button:has-text("Share now")',
			'div[role="menuitem"]:has-text("Share to Feed")',
			'div[role="button"]:has-text("Share to Feed")',
			'button:has-text("Share to Feed")',
			'div[role="menuitem"]:has-text("Post")',
			'div[role="button"]:has-text("Post")',
			'button:has-text("Post")',
		], 2500);
		if (direct) return direct;

		const dialogShareClicked = await page.evaluate(() => {
			const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
			const isVisible = (el) => {
				if (!el) return false;
				const style = window.getComputedStyle(el);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
			for (const dialog of dialogs) {
				const candidates = Array.from(
					dialog.querySelectorAll('[data-ad-rendering-role="share_button"], div[role="button"], button, span'),
				);
				const target = candidates.find((node) => {
					const text = normalize(node.textContent || "");
					const aria = normalize(node.getAttribute?.("aria-label") || "");
					const role = String(node.getAttribute?.("role") || "");
					return (
						isVisible(node) &&
						(role === "button" ||
							node.tagName === "BUTTON" ||
							node.tagName === "A" ||
							(node instanceof HTMLElement && node.hasAttribute("data-ad-rendering-role"))) &&
						(text === "Share" ||
							aria === "Share" ||
							text === "Share now" ||
							aria === "Share now" ||
							text === "Share to Feed" ||
							aria === "Share to Feed" ||
							text.includes("Share") ||
							aria.includes("Share"))
					);
				});
				if (!target) continue;
				let clickable = target;
				while (clickable && clickable !== document.body) {
					const role = String(clickable.getAttribute?.("role") || "");
					if (
						clickable instanceof HTMLElement &&
						isVisible(clickable) &&
						(role === "button" || clickable.tagName === "BUTTON" || clickable.tagName === "A")
					) {
						const rect = clickable.getBoundingClientRect();
						clickable.click();
						return {
							x: Math.round(rect.left + rect.width / 2),
							y: Math.round(rect.top + rect.height / 2),
							label: normalize(clickable.textContent || clickable.getAttribute?.("aria-label") || "Share"),
						};
					}
					clickable = clickable.parentElement;
				}
			}
			return null;
		});
		if (dialogShareClicked?.x && dialogShareClicked?.y) {
			await page.mouse.click(dialogShareClicked.x, dialogShareClicked.y, { delay: 40 });
			return `dialog-share:${dialogShareClicked.label || "Share"}`;
		}

		const successVisible = await page
			.locator('text=/Shared successfully|Your post was shared|Post published/i')
			.first()
			.isVisible()
			.catch(() => false);
		if (successVisible) {
			return "share-success-signal";
		}

		await page.waitForTimeout(800);
	}

	return null;
}

async function sharePostViaUi(page, post) {
	await dismissInterruptivePopups(page);
	const shareText = getFacebookPostText(post);
	const shareSelector = (await clickShareButtonForPost(page, shareText)) ||
		(await clickShareButtonInFeed(page));
	if (!shareSelector) {
		return {
			status: "error",
			error: "Could not find Share button for the newly published Facebook post",
			mode: "facebook-ui",
		};
	}

	await page.waitForTimeout(1200);
	await dismissInterruptivePopups(page);
	const confirmSelector = await confirmUiShare(page);
	if (!confirmSelector) {
		return {
			status: "error",
			error: "Clicked Share but could not confirm the Facebook share action",
			mode: "facebook-ui",
			shareSelector,
		};
	}

	return {
		status: "posted",
		mode: "facebook-ui",
		shareSelector,
		confirmSelector,
	};
}

async function sharePostToConfiguredAccounts(page, post, account) {
	const shareToAccountIds = Array.isArray(account?.metadata?.shareToAccountIds)
		? account.metadata.shareToAccountIds
		: [];
	if (!shareToAccountIds.length) return [];

	const uiShareResult = await sharePostViaUi(page, post);
	if (uiShareResult?.status === "posted") {
		logStep("share:ui-success", JSON.stringify(uiShareResult));
		return shareToAccountIds.map((accountId) => ({
			accountId,
			...uiShareResult,
		}));
	}

	const shareText = getFacebookPostText(post);
	const permalink = await extractPublishedPostPermalink(page, post);
	if (!permalink) {
		return shareToAccountIds.map((accountId) => ({
			accountId,
			status: "error",
			error:
				uiShareResult?.error ||
				"Could not extract published post permalink for share",
			uiShareAttempt: uiShareResult,
		}));
	}

	const results = [];
	for (const shareAccountId of shareToAccountIds) {
		try {
			const shareAccount = await getAccount("facebook", shareAccountId);
			if (!shareAccount) {
				results.push({
					accountId: shareAccountId,
					status: "error",
					error: "Share target account not found",
					permalink,
				});
				continue;
			}
			const shared = await shareLinkToFacebookFeed(
				shareAccount,
				shareText,
				permalink,
			);
			logStep("share:success", `${shareAccountId} :: ${permalink}`);
			results.push({
				accountId: shareAccountId,
				status: "posted",
				permalink,
				...shared,
			});
		} catch (error) {
			logStep("share:error", `${shareAccountId} :: ${error?.message || String(error)}`);
			results.push({
				accountId: shareAccountId,
				status: "error",
				error: error?.message || String(error),
				permalink,
			});
		}
	}
	return results;
}

async function pageLooksLikeAuthRequired(page) {
	const url = String(page?.url?.() || "");
	const isLoginUrl = /facebook\.com\/login/i.test(url) ||
		/facebook\.com\/checkpoint/i.test(url) ||
		/facebook\.com\/accounts/i.test(url);

	const emailCount = await page
		.locator('input[name="email"], input[id="email"], input[aria-label*="Email" i], input[autocomplete="username"]')
		.count()
		.catch(() => 0);
	const passwordCount = await page
		.locator('input[name="pass"], input[id="pass"], input[type="password"], input[autocomplete="current-password"]')
		.count()
		.catch(() => 0);
	const hasLoginForm = emailCount > 0 && passwordCount > 0;
	const hasComposerSurface = await page
		.evaluate(() => {
			const bodyText = String(document.body?.innerText || "")
				.replace(/\s+/g, " ")
				.trim();
			const selectors = [
				'span',
				'div[role="button"]',
				'button',
				'[aria-label]',
			];
			const composerTextSeen = selectors.some((selector) =>
				Array.from(document.querySelectorAll(selector)).some((node) =>
					/what's on your mind\??|create post|write something/i.test(
						String(
							node.textContent ||
								node.getAttribute?.("aria-label") ||
								"",
						).replace(/\s+/g, " ").trim(),
					),
				),
			);
			return (
				composerTextSeen ||
				/add to your post|photo\/video|more post options/i.test(bodyText)
			);
		})
		.catch(() => false);

	logStep("auth-check:url", url);
	logStep("auth-check:isLoginUrl", String(isLoginUrl));
	logStep("auth-check:hasLoginForm", `${hasLoginForm} (email=${emailCount}, pass=${passwordCount})`);
	logStep("auth-check:hasComposerSurface", String(hasComposerSurface));

	if (!isLoginUrl && hasComposerSurface) {
		return false;
	}

	return isLoginUrl || hasLoginForm;
}

async function ensureFacebookLoggedIn(page, debug = null) {
	const username = process.env.FACEBOOK_LOGIN_USERNAME;
	const password = process.env.FACEBOOK_LOGIN_PASSWORD;
	
	if (!username || !password) {
		throw new Error("Facebook login credentials not configured. Set FACEBOOK_LOGIN_USERNAME and FACEBOOK_LOGIN_PASSWORD in .env");
	}
	
	logStep("facebook:login:start");
	
	let emailFilled = false;
	for (const selector of [
		'input[name="email"]',
		'input[id="email"]',
		'input[aria-label*="Email" i]',
		'input[autocomplete="username"]',
		'input[type="text"]',
	]) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => true))) {
				await locator.fill(username);
				logStep("facebook:login:email-filled");
				await debug?.log("facebook:login:email-filled", { selector });
				emailFilled = true;
				break;
			}
		} catch {}
	}

	let passwordFilled = false;
	for (const selector of [
		'input[name="pass"]',
		'input[id="pass"]',
		'input[type="password"]',
		'input[autocomplete="current-password"]',
	]) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => true))) {
				await locator.fill(password);
				logStep("facebook:login:password-filled");
				await debug?.log("facebook:login:password-filled", { selector });
				passwordFilled = true;
				break;
			}
		} catch {}
	}

	if (!emailFilled || !passwordFilled) {
		throw new Error(
			`Unable to fill Facebook login form (emailFilled=${emailFilled}, passwordFilled=${passwordFilled})`,
		);
	}

	const loginClicked = await clickFirstWithDebug(page, [
		'button[name="login"]',
		'div[role="button"][aria-label="Log In"]',
		'div[role="button"][aria-label="Log in to Facebook"]',
		'div[role="button"]:has-text("Log In")',
		'div[role="button"]:has-text("Log in")',
		'button:has-text("Log In")',
		'button:has-text("Log in")',
		'button[type="submit"]',
	], debug, "facebook:login:submit-click");

	if (!loginClicked) {
		let submitted = false;
		try {
			const roleButton = page.getByRole("button", { name: /log in/i }).first();
			if ((await roleButton.count().catch(() => 0)) > 0) {
				await roleButton.click({ timeout: 4000, force: true });
				logStep("facebook:login:clicked", 'getByRole(button[name=/log in/i])');
				await debug?.log("facebook:login:clicked", {
					selector: 'getByRole(button[name=/log in/i])',
				});
				submitted = true;
			}
		} catch {
			// continue
		}
		if (!submitted) {
			try {
				submitted = await page.evaluate(() => {
					const candidates = Array.from(
						document.querySelectorAll('button, div[role="button"], a[role="button"], input[type="submit"]'),
					);
					const target = candidates.find((node) => {
						const text = String(
							node.textContent ||
							node.getAttribute?.("aria-label") ||
							node.getAttribute?.("value") ||
							"",
						)
							.replace(/\s+/g, " ")
							.trim()
							.toLowerCase();
						return text === "log in" || text === "log in to facebook";
					});
					if (!target) return false;
					target.click();
					return true;
				});
				if (submitted) {
					logStep("facebook:login:clicked", "dom-eval-log-in");
					await debug?.log("facebook:login:clicked", {
						selector: "dom-eval-log-in",
					});
				}
			} catch {
				// continue
			}
		}
		if (submitted) {
			await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
			await page.waitForTimeout(2500);
			logStep("facebook:login:success");
			await debug?.log("facebook:login:success", { mode: "fallback-submit" });
			return;
		}
		const passwordField = page.locator(
			'input[name="pass"], input[id="pass"], input[type="password"], input[autocomplete="current-password"]',
		).first();
		if ((await passwordField.count().catch(() => 0)) > 0) {
			await passwordField.press("Enter").catch(() => {});
			logStep("facebook:login:submit-enter");
			await debug?.log("facebook:login:submit-enter", { ok: true });
		} else {
			await debug?.screenshot(page, "facebook-login-button-missing");
			throw new Error("Unable to find Facebook login button");
		}
	} else {
		logStep("facebook:login:clicked", loginClicked);
		await debug?.log("facebook:login:clicked", { selector: loginClicked });
	}

	await page.waitForLoadState("domcontentloaded", { timeout: 30000 }).catch(() => {});
	await page.waitForTimeout(2500);

	logStep("facebook:login:success");
	await debug?.log("facebook:login:success", { mode: "primary-submit" });
}

async function clickFirst(page, selectors, timeout = 4000) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout, force: true });
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function clickFirstWithDebug(page, selectors, debug, stepName, timeout = 4000) {
	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			const count = await locator.count().catch(() => 0);
			if (count > 0) {
				await locator.click({ timeout, force: true });
				await debug?.log(stepName, { selector, ok: true });
				return selector;
			}
		} catch (error) {
			const message = String(error?.message || error || "");
			const clickLikelySucceeded =
				message.includes("click action done") &&
				message.includes("waiting for scheduled navigations to finish");
			if (clickLikelySucceeded) {
				await debug?.log(stepName, {
					selector,
					ok: true,
					note: "navigation-wait-timeout-after-click",
				});
				return selector;
			}
			await debug?.log(stepName, {
				selector,
				ok: false,
				error: message,
			});
		}
	}
	await debug?.log(stepName, { ok: false, selectors });
	return null;
}

async function dismissInterruptivePopups(page) {
	const dismissSelectors = [
		'div[role="button"][aria-label="Close"]',
		'button[aria-label="Close"]',
		'div[role="dialog"] div[role="button"]:has-text("Not now")',
		'div[role="dialog"] button:has-text("Not now")',
		'div[role="dialog"] div[role="button"]:has-text("Not Now")',
		'div[role="dialog"] button:has-text("Not Now")',
		'div[role="dialog"] div[role="button"]:has-text("Maybe later")',
		'div[role="dialog"] button:has-text("Maybe later")',
	];
	for (const selector of dismissSelectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0 && (await locator.isVisible().catch(() => false))) {
				await locator.click({ timeout: 2000, force: true });
				logStep("popup:dismissed", selector);
				await page.waitForTimeout(500);
				return selector;
			}
		} catch {
			// continue
		}
	}
	return null;
}

async function dismissFacebookLoginOverlay(page) {
	const overlayPresent = await page
		.evaluate(() => {
			const bodyText = String(document.body?.innerText || "")
				.replace(/\s+/g, " ")
				.trim();
			const hasLoginWords = /email or phone number|password|forgot password\?|create new account/i.test(
				bodyText,
			);
			const hasPageWords = /color with ash|followers|photos|intro|see more from/i.test(bodyText);
			return hasLoginWords && hasPageWords;
		})
		.catch(() => false);
	if (!overlayPresent) return null;

	const closeSelector = await clickFirst(page, [
		'div[role="button"][aria-label="Close"]',
		'button[aria-label="Close"]',
		'div[aria-label="Close"]',
	], 3000);
	if (!closeSelector) return null;
	await page.waitForTimeout(1200);
	logStep("overlay:dismissed", closeSelector);
	return closeSelector;
}

async function fillComposer(page, text) {
	const selectors = [
		'div[role="dialog"] [contenteditable="true"][role="textbox"]',
		'div[role="dialog"] div[contenteditable="true"]',
		'div[role="dialog"] textarea',
		'div[role="dialog"] [data-lexical-editor="true"]',
		'div[role="dialog"] div[aria-label*="What\'s on your mind" i]',
		'div[role="dialog"] div[aria-label*="Write something" i]',
		'[role="main"] [contenteditable="true"][role="textbox"]',
		'[role="main"] div[contenteditable="true"]',
		'[role="main"] textarea',
		'[role="main"] [data-lexical-editor="true"]',
		'div[contenteditable="true"][role="textbox"]',
		'div[contenteditable="true"]',
		'textarea',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
				await locator.click({ timeout: 4000, force: true });

				const isEditable = await locator.evaluate((el) => {
					if (!el) return false;
					const tag = String(el.tagName || "").toLowerCase();
					return (
						tag === "textarea" ||
						tag === "input" ||
						el.isContentEditable ||
						el.getAttribute?.("contenteditable") === "true"
					);
				}).catch(() => false);

				if (isEditable) {
					try {
						await locator.fill(text, { timeout: 4000 });
					} catch {
						await page.keyboard.insertText(text).catch(() => {});
					}
				} else {
					await page.keyboard.insertText(text).catch(() => {});
				}

				const captured = await locator.evaluate((el) => {
					if (!el) return "";
					return String(
						el.value ??
							el.textContent ??
							el.innerText ??
							el.getAttribute?.("aria-label") ??
							"",
					).trim();
				}).catch(() => "");
				if (captured) {
					return selector;
				}
				await page.waitForTimeout(500);
				const fallbackCaptured = await page.evaluate(() => {
					const active = document.activeElement;
					if (!active) return "";
					return String(
						active.value ??
							active.textContent ??
							active.innerText ??
							active.getAttribute?.("aria-label") ??
							"",
					).trim();
				}).catch(() => "");
				if (fallbackCaptured) {
					return selector;
				}
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function findVisibleComposerEditor(page) {
	const selectors = [
		'div[role="dialog"] [contenteditable="true"][role="textbox"]',
		'div[role="dialog"] [data-lexical-editor="true"]',
		'div[role="dialog"] textarea',
		'[role="main"] [contenteditable="true"][role="textbox"]',
		'[role="main"] [data-lexical-editor="true"]',
		'[role="main"] textarea',
		'div[contenteditable="true"][role="textbox"]',
		'div[data-lexical-editor="true"]',
		'textarea',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count().catch(() => 0)) === 0) continue;
			if (await locator.isVisible().catch(() => false)) {
				return selector;
			}
		} catch {
			// continue
		}
	}

	return null;
}

async function waitForComposerEditor(page, timeoutMs = 5000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const selector = await findVisibleComposerEditor(page);
		if (selector) return selector;
		await page.waitForTimeout(250);
	}
	return null;
}

async function waitForFacebookComposerSurface(page, timeoutMs = 12000) {
	const deadline = Date.now() + timeoutMs;
	const selectors = [
		'div[role="button"]:has-text("What\'s on your mind?")',
		'div[role="button"]:has-text("What\'s on your mind")',
		'span:has-text("What\'s on your mind?")',
		'span:has-text("What\'s on your mind")',
		'div[role="button"]:has-text("Write something")',
		'div[role="button"]:has-text("Create post")',
		'[role="main"] [contenteditable="true"]',
		'[role="main"] [data-lexical-editor="true"]',
	];

	while (Date.now() < deadline) {
		for (const selector of selectors) {
			try {
				const locator = page.locator(selector).first();
				if ((await locator.count().catch(() => 0)) === 0) continue;
				if (await locator.isVisible().catch(() => false)) {
					return selector;
				}
			} catch {
				// continue
			}
		}

		const hasMeaningfulBody = await page
			.evaluate(() => String(document.body?.innerText || "").replace(/\s+/g, " ").trim().length > 80)
			.catch(() => false);
		if (hasMeaningfulBody) {
			const readyEditor = await findVisibleComposerEditor(page);
			if (readyEditor) return readyEditor;
		}

		await page.waitForTimeout(400);
	}

	return null;
}

async function openFacebookComposer(page) {
	const selectors = [
		'div[role="button"]:has-text("What\'s on your mind?")',
		'div[role="button"]:has-text("What\'s on your mind")',
		'span:has-text("What\'s on your mind?")',
		'span:has-text("What\'s on your mind")',
		'div[role="button"]:has-text("Write something")',
		'div[role="button"]:has-text("Create post")',
		'button:has-text("Create post")',
		'div[aria-label="Create a post"]',
		'div[role="button"][aria-label*="What\'s on your mind"]',
		'div[role="button"][aria-label*="Create a post"]',
		'div[role="button"]:has-text("Post")',
		'a[role="button"]:has-text("Post")',
		'h2:has-text("Create post")',
		'div[data-pagelet="FeedComposer"]',
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000, force: true });
				const readySelector = await waitForComposerEditor(page, 2500);
				if (readySelector) {
					return `${selector} -> ${readySelector}`;
				}
			}
		} catch {
			// continue
		}
	}

	try {
		const clicked = await page.evaluate(() => {
			const normalize = (value) =>
				String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
			const isVisible = (node) => {
				if (!(node instanceof HTMLElement)) return false;
				const style = window.getComputedStyle(node);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = node.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const spans = Array.from(document.querySelectorAll("span")).filter((node) =>
				normalize(node.textContent).includes("what's on your mind"),
			);
			for (const span of spans) {
				let current = span;
				while (current && current !== document.body) {
					if (
						current instanceof HTMLElement &&
						isVisible(current) &&
						(current.getAttribute("role") === "button" ||
							current.getAttribute("tabindex") === "0" ||
							current.tagName === "BUTTON")
					) {
						current.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
						current.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
						current.click();
						return "dom-ancestor-whats-on-your-mind";
					}
					current = current.parentElement;
				}
			}
			return null;
		});
		if (clicked) {
			const readySelector = await waitForComposerEditor(page, 2500);
			if (readySelector) {
				return `${clicked} -> ${readySelector}`;
			}
		}
	} catch {
		// continue
	}

	return null;
}

async function switchFacebookProfile(page, profileName) {
	const name = String(profileName || "").trim();
	if (!name) return null;

	let openProfileMenu = null;
	try {
		const profileButton = page.getByRole("button", { name: "Your profile" }).first();
		if ((await profileButton.count().catch(() => 0)) > 0) {
			await profileButton.click({ timeout: 4000, force: true });
			openProfileMenu = "getByRole(button[name=Your profile])";
		}
	} catch {
		// continue
	}

	if (!openProfileMenu) {
		openProfileMenu = await clickFirst(page, [
			'div[role="button"][aria-label="Your profile"]',
			'div[role="button"]:has-text("Your profile")',
			'button[aria-label="Your profile"]',
		]);
	}

	if (!openProfileMenu) return null;

	await page.waitForTimeout(1200);

	const selectors = [
		`div[role="menuitem"]:has-text("${name}")`,
		`div[role="button"]:has-text("${name}")`,
		`a:has-text("${name}")`,
		`span:has-text("${name}")`,
		`div[role="menuitem"]:has-text("Switch profile")`,
		`div[role="menuitem"]:has-text("See all profiles")`,
		`div[role="button"]:has-text("Switch profile")`,
		`div[role="button"]:has-text("See all profiles")`,
	];

	for (const selector of selectors) {
		try {
			const locator = page.locator(selector).first();
			if ((await locator.count()) > 0) {
				await locator.click({ timeout: 4000 });
				await page.waitForTimeout(2000);
				return selector;
			}
		} catch {
			// continue
		}
	}

	return openProfileMenu;
}

async function attachMedia(page, mediaPath) {
	if (!mediaPath) return null;
	const allInputSelector =
		'input[type="file"], input[accept*="image" i], input[accept*="video" i]';
	const inputSelectors = [
		'div[role="dialog"] input[type="file"]',
		'input[type="file"]',
	];
	const tryKnownInputs = async () => {
		for (const selector of inputSelectors) {
			try {
				const locator = page.locator(selector);
				const count = await locator.count();
				for (let index = 0; index < count; index += 1) {
					try {
						await locator.nth(index).setInputFiles(mediaPath, { timeout: 6000 });
						return `${selector}[${index}]`;
					} catch {
						// try next file input
					}
				}
			} catch {
				// continue
			}
		}
		return null;
	};

	const attachedViaKnownInput = await tryKnownInputs();
	if (attachedViaKnownInput) return attachedViaKnownInput;

	const addPhotoSelectors = [
		'div[role="button"]:has-text("Photo/video")',
		'div[role="button"]:has-text("Photo/video") span',
		'div[role="button"]:has-text("Photo/Video")',
		'div[role="button"]:has-text("Add photo/video")',
		'div[role="button"]:has-text("Add photos/videos")',
		'div[role="button"]:has-text("Add photos")',
		'div[role="button"]:has-text("Add photo")',
		'div[aria-label*="Photo/video"]',
		'div[aria-label*="Add photo"]',
		'div[aria-label*="photos/videos"]',
	];

	await clickFirst(page, addPhotoSelectors, 4000);
	await page.waitForTimeout(1200);

	try {
		const anyInputs = page.locator(allInputSelector);
		const count = await anyInputs.count();
		for (let index = 0; index < count; index += 1) {
			try {
				await anyInputs.nth(index).setInputFiles(mediaPath, { timeout: 6000 });
				return `${allInputSelector}[${index}]`;
			} catch {
				// keep trying additional inputs
			}
		}
	} catch {
		// continue
	}

	const attachedAfterOpen = await tryKnownInputs();
	if (attachedAfterOpen) return attachedAfterOpen;

	for (const selector of addPhotoSelectors) {
		try {
			const chooserPromise = page
				.waitForEvent("filechooser", { timeout: 3500 })
				.catch(() => null);
			const clicked = await clickFirst(page, [selector], 2000);
			if (!clicked) continue;
			const chooser = await chooserPromise;
			if (!chooser) continue;
			await chooser.setFiles(mediaPath);
			return `filechooser:${selector}`;
		} catch {
			// continue
		}
	}

	return null;
}

async function confirmPostSubmitted(page) {
	const dialogLocator = page.locator('div[role="dialog"]').first();
	const postButtonLocator = page
		.getByRole("dialog")
		.getByRole("button", { name: /^(Post|Post now|Share now)$/i })
		.last();
	const ariaSubmitLocator = page.locator(
		'div[role="dialog"] [aria-label="Post"], div[role="dialog"] [aria-label="Post now"], div[role="dialog"] [aria-label="Share now"]',
	);
	const successSignals = [
		page.locator('text=/Your post is now published/i').first(),
		page.locator('text=/Your post was shared/i').first(),
		page.locator('text=/Post published/i').first(),
		page.locator('text=/Shared successfully/i').first(),
	];
	const dialogComposerLocator = page.locator(
		'div[role="dialog"] [contenteditable="true"][role="textbox"], div[role="dialog"] div[contenteditable="true"], div[role="dialog"] textarea',
	);
	const mainComposerLocator = page.locator(
		'[role="main"] div[role="button"]:has-text("What\'s on your mind?"), div[role="button"]:has-text("What\'s on your mind?"), [role="main"] [contenteditable="true"][role="textbox"]',
	);

	for (let attempt = 0; attempt < 24; attempt += 1) {
		await dismissInterruptivePopups(page);
		const dialogVisible = await dialogLocator.isVisible().catch(() => false);
		const postButtonVisible = await postButtonLocator.isVisible().catch(() => false);
		const ariaSubmitVisible = await ariaSubmitLocator
			.first()
			.isVisible()
			.catch(() => false);
			for (const signal of successSignals) {
				if (await signal.isVisible().catch(() => false)) {
					return true;
				}
			}
			const dialogComposerVisible = await dialogComposerLocator
				.first()
				.isVisible()
				.catch(() => false);
			const mainComposerVisible = await mainComposerLocator
				.first()
				.isVisible()
				.catch(() => false);
			if (!dialogVisible) {
				return true;
			}
			if (!postButtonVisible && !ariaSubmitVisible && !dialogComposerVisible && mainComposerVisible) {
				return true;
			}
			if (postButtonVisible || ariaSubmitVisible) {
				await clickFacebookFinalPostButton(page).catch(() => null);
				await page.waitForTimeout(1200);
				continue;
			}
		await page.waitForTimeout(1000);
	}

	return false;
}

function isClosedTargetError(error) {
	const message = String(error?.message || error || "");
	return /target page, context or browser has been closed/i.test(message);
}

async function getPublishSignalCount(page) {
	const signalLocator = page.locator(
		"text=/Your post is now published|Your post was shared|Post published|Shared successfully/i",
	);
	return await signalLocator.count().catch(() => 0);
}

async function waitForPublishSignal(page, baselineCount = 0) {
	const signalLocator = page.locator(
		"text=/Your post is now published|Your post was shared|Post published|Shared successfully/i",
	);
	for (let attempt = 0; attempt < 20; attempt += 1) {
		if (page.isClosed()) return false;
		await dismissInterruptivePopups(page).catch((error) => {
			if (isClosedTargetError(error)) return;
			throw error;
		});
		const visible = await signalLocator.first().isVisible().catch(() => false);
		const count = await signalLocator.count().catch(() => 0);
		if (visible && count > baselineCount) return true;
		await page.waitForTimeout(500).catch((error) => {
			if (isClosedTargetError(error)) return;
			throw error;
		});
	}
	return false;
}

async function verifyPostVisibleOnFeed(page, value) {
	const snippets = buildVerificationSnippets(value).map((snippet) => snippet.slice(0, 80));
	if (!snippets.length) return false;
	for (let attempt = 0; attempt < 8; attempt += 1) {
		try {
			await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 45000 });
		} catch {
			// continue
		}
		const visible = await page
			.evaluate((targetSnippets) => {
				const normalize = (value) =>
					String(value || "")
						.replace(/\s+/g, " ")
						.trim();
				const articles = Array.from(document.querySelectorAll('div[role="article"]'));
				return articles.some((node) => {
					const text = normalize(node.innerText || "");
					return targetSnippets.some((snippet) => text.includes(snippet));
				});
			}, snippets)
			.catch(() => false);
		if (visible) return true;
		await page.waitForTimeout(3000);
	}
	return false;
}

async function clickDialogActionByText(page, label) {
	const textLocator = page
		.getByRole("dialog")
		.getByText(new RegExp(`^${label}$`))
		.last();
	if ((await textLocator.count().catch(() => 0)) === 0) {
		return null;
	}

	const containerAttempts = [
		textLocator.locator("xpath=ancestor::div[@role='button'][1]"),
		textLocator.locator("xpath=ancestor::button[1]"),
		textLocator.locator("xpath=ancestor::div[@role='none'][1]"),
		textLocator.locator("xpath=ancestor::div[@tabindex][1]"),
	];

	for (const locator of containerAttempts) {
		try {
			if ((await locator.count()) > 0) {
				await locator.first().click({ timeout: 4000, force: true });
				return `dialog-action:${label}`;
			}
		} catch {
			// continue
		}
	}

	try {
		await textLocator.click({ timeout: 4000, force: true });
		return `dialog-text:${label}`;
	} catch {
		return null;
	}
}

async function clickInlineFacebookSubmitButton(page) {
	const directSelectors = [
		'[role="main"] button[aria-label="Post"]',
		'[role="main"] button[aria-label="Post now"]',
		'[role="main"] button[aria-label="Share now"]',
		'[role="main"] button[aria-label="Send"]',
		'[role="main"] [role="button"][aria-label="Post"]',
		'[role="main"] [role="button"][aria-label="Post now"]',
		'[role="main"] [role="button"][aria-label="Share now"]',
		'[role="main"] [role="button"][aria-label="Send"]',
	];

	for (const selector of directSelectors) {
		try {
			const locator = page.locator(selector).last();
			if ((await locator.count().catch(() => 0)) === 0) continue;
			if (!(await locator.isVisible().catch(() => false))) continue;
			const disabled = await locator.getAttribute("aria-disabled").catch(() => null);
			if (String(disabled || "").toLowerCase() === "true") continue;
			await locator.click({ timeout: 4000, force: true });
			return selector;
		} catch {
			// continue
		}
	}

	try {
		const roleButton = page
			.getByRole("button", { name: /^(Post|Post now|Share now|Send)$/i })
			.last();
		if ((await roleButton.count().catch(() => 0)) > 0) {
			await roleButton.click({ timeout: 4000, force: true });
			return 'role=button[name~="Post|Post now|Share now|Send"]';
		}
	} catch {
		// continue
	}

	try {
		const target = await page.evaluate(() => {
			const isVisible = (node) => {
				if (!(node instanceof HTMLElement)) return false;
				const style = window.getComputedStyle(node);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = node.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const isEditable = (node) =>
				node instanceof HTMLElement &&
				(node.tagName === "TEXTAREA" ||
					node.tagName === "INPUT" ||
					node.isContentEditable ||
					node.getAttribute("contenteditable") === "true");
			const normalize = (value) =>
				String(value || "")
					.replace(/\s+/g, " ")
					.trim()
					.toLowerCase();
			const editorCandidates = Array.from(
				document.querySelectorAll(
					'[role="main"] [contenteditable="true"], [role="main"] textarea, [contenteditable="true"], textarea',
				),
			).filter((node) => isEditable(node) && isVisible(node));
			const editor =
				(isEditable(document.activeElement) && isVisible(document.activeElement)
					? document.activeElement
					: null) || editorCandidates[0];
			if (!editor) return null;

			let container = editor.parentElement;
			for (let depth = 0; depth < 6 && container; depth += 1) {
				const rect = container.getBoundingClientRect();
				if (rect.width >= 300 && rect.height >= 120) break;
				container = container.parentElement;
			}
			if (!container) return null;

			const buttons = Array.from(
				container.querySelectorAll('button, div[role="button"], a[role="button"], [tabindex="0"]'),
			).filter((node) => isVisible(node));
			const editorRect = editor.getBoundingClientRect();
			const candidates = buttons
				.map((node) => {
					const rect = node.getBoundingClientRect();
					const text = normalize(node.textContent);
					const aria = normalize(node.getAttribute?.("aria-label"));
					const combined = `${text} ${aria}`.trim();
					const disabled = normalize(node.getAttribute?.("aria-disabled")) === "true";
					if (disabled) return null;

					let score = 0;
					if (/(post|publish|share now|send)/.test(combined)) score += 10;
					if (/(photo|video|reel|live|emoji|gif|feeling|tag|location|background|boost)/.test(combined)) score -= 8;
					if (rect.top >= editorRect.bottom - 20) score += 2;
					score += rect.left > editorRect.left ? 1 : 0;
					score += rect.left > editorRect.right ? 2 : 0;
					score += rect.top > editorRect.top ? 1 : 0;
					score += rect.width <= 80 && rect.height <= 80 ? 1 : 0;
					score += rect.left / 1000;

					return {
						x: Math.round(rect.left + rect.width / 2),
						y: Math.round(rect.top + rect.height / 2),
						score,
						label: combined || "inline-submit-candidate",
					};
				})
				.filter(Boolean)
				.sort((a, b) => b.score - a.score);

			return candidates[0] || null;
		});

		if (target?.x && target?.y && target?.score > 1) {
			await page.mouse.click(target.x, target.y, { delay: 40 });
			return `inline-mouse:${target.label}`;
		}
	} catch {
		// continue
	}

	return null;
}

async function clickFacebookSubmitButton(page) {
	const nextClicked = await clickDialogActionByText(page, "Next");
	if (nextClicked) {
		await page.waitForTimeout(2000);
		return nextClicked;
	}

	const inlineClicked = await clickInlineFacebookSubmitButton(page);
	if (inlineClicked) {
		return inlineClicked;
	}

	const postButtons = page
		.getByRole("dialog")
		.getByRole("button", { name: /^Post$/ });
	const postCount = await postButtons.count().catch(() => 0);
	if (postCount > 0) {
		await postButtons.nth(postCount - 1).click({ timeout: 4000 });
		return 'role=button[name="Post"]';
	}

	const ariaPostButtons = page.locator('div[role="dialog"] [aria-label="Post"]');
	const ariaPostCount = await ariaPostButtons.count().catch(() => 0);
	if (ariaPostCount > 0) {
		await ariaPostButtons.nth(ariaPostCount - 1).click({ timeout: 4000 });
			return 'div[role="dialog"] [aria-label="Post"]';
		}

	const postClicked = await clickDialogActionByText(page, "Post");
	if (postClicked) {
		return postClicked;
	}

	const inlineComposer = page
		.locator('[role="main"] [contenteditable="true"], [role="main"] textarea')
		.first();
	if ((await inlineComposer.count().catch(() => 0)) > 0) {
		await inlineComposer.click({ timeout: 3000 }).catch(() => {});
		await page.keyboard.press("Meta+Enter").catch(() => {});
		await page.keyboard.press("Control+Enter").catch(() => {});
		return "inline-keyboard-submit";
	}

	return null;
}

async function clickFacebookFinalPostButton(page) {
	await dismissInterruptivePopups(page);
	// Explicit support for FB variants where the visible action is nested in role="none" wrappers.
	const roleNonePostWrappers = page.locator(
		'div[role="dialog"] div[role="none"]:has(span:has-text("Post")), div[role="dialog"] div[role="none"]:has(span:has-text("Post now")), div[role="dialog"] div[role="none"]:has(span:has-text("Share now")), div[role="none"]:has(span:has-text("Post")), div[role="none"]:has(span:has-text("Post now")), div[role="none"]:has(span:has-text("Share now"))',
	);
	const wrapperCount = await roleNonePostWrappers.count().catch(() => 0);
	for (let index = wrapperCount - 1; index >= 0; index -= 1) {
		try {
			const wrapper = roleNonePostWrappers.nth(index);
			await wrapper.click({ timeout: 4000, force: true });
			await wrapper.dispatchEvent("mousedown").catch(() => {});
			await wrapper.dispatchEvent("mouseup").catch(() => {});
			await wrapper.dispatchEvent("click").catch(() => {});
			const text = await roleNonePostWrappers.nth(index).innerText().catch(() => "");
			return `role-none-wrapper:${String(text || "").trim().slice(0, 40)}`;
		} catch {
			// continue
		}
	}

	// Exact fallback for variants where only nested text spans are stable.
	try {
		const target = await page.evaluate(() => {
			const isVisible = (el) => {
				if (!el) return false;
				const style = window.getComputedStyle(el);
				if (!style || style.visibility === "hidden" || style.display === "none") return false;
				const rect = el.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0;
			};
			const dialogs = Array.from(document.querySelectorAll('div[role="dialog"]'));
			const spans = dialogs.flatMap((dialog) =>
				Array.from(dialog.querySelectorAll("span")),
			).filter(
				(el) => /^(Post|Post now|Share now)$/i.test((el.textContent || "").trim()),
			);
			for (let i = spans.length - 1; i >= 0; i -= 1) {
				let node = spans[i];
				while (node && node !== document.body) {
					if (node instanceof HTMLElement && node.getAttribute("role") === "none" && isVisible(node)) {
						const rect = node.getBoundingClientRect();
						return {
							x: Math.round(rect.left + rect.width / 2),
							y: Math.round(rect.top + rect.height / 2),
							label: (spans[i].textContent || "").trim(),
						};
					}
					node = node.parentElement;
				}
			}
			return null;
		});
		if (target?.x && target?.y) {
			await page.mouse.click(target.x, target.y, { delay: 40 });
			return `exact-span-post-mouse:${target.label || "Post"}`;
		}
	} catch {
		// continue
	}

	const postButtons = page
		.getByRole("dialog")
		.getByRole("button", { name: /^(Post|Post now|Share now)$/i });
	const postCount = await postButtons.count().catch(() => 0);
	if (postCount > 0) {
		await postButtons.nth(postCount - 1).click({ timeout: 4000 });
		return 'role=button[name~="Post|Post now|Share now"]';
	}

	const ariaPostButtons = page.locator(
		'div[role="dialog"] [aria-label="Post"], div[role="dialog"] [aria-label="Post now"], div[role="dialog"] [aria-label="Share now"]',
	);
	const ariaPostCount = await ariaPostButtons.count().catch(() => 0);
	if (ariaPostCount > 0) {
		await ariaPostButtons.nth(ariaPostCount - 1).click({ timeout: 4000 });
		return 'div[role="dialog"] [aria-label~="Post|Post now|Share now"]';
	}

	for (const label of ["Post", "Post now", "Share now"]) {
		const postClicked = await clickDialogActionByText(page, label);
		if (postClicked) return postClicked;
	}

	// Last-resort: click any visible submit-like button in dialog.
	const dialogButtons = page.locator('div[role="dialog"] button, div[role="dialog"] div[role="button"]');
	const count = await dialogButtons.count().catch(() => 0);
	for (let index = 0; index < count; index += 1) {
		const button = dialogButtons.nth(index);
		const label = (await button.innerText().catch(() => "")).trim();
		const aria = (await button.getAttribute("aria-label").catch(() => "")) || "";
		const text = `${label} ${aria}`.toLowerCase();
		if (!text) continue;
		if (!/(post|share|publish)/i.test(text)) continue;
		if (/(boost|schedule|save draft|draft)/i.test(text)) continue;
		const disabled = await button.getAttribute("aria-disabled").catch(() => null);
		if (String(disabled || "").toLowerCase() === "true") continue;
		try {
			await button.click({ timeout: 3000 });
			return `dialog-generic:${text}`;
		} catch {
			// continue
		}
	}

	return null;
}

async function handlePageIdentitySwitch(page) {
	const switchSelector = await clickFirst(page, [
		'div[role="button"]:has-text("Switch now")',
		'button:has-text("Switch now")',
		'div[role="button"]:has-text("Switch")',
		'button:has-text("Switch")',
	]);
	if (!switchSelector) return null;
	await page.waitForTimeout(4000);
	return switchSelector;
}

export default async function postToFacebookBrowser(post, context = {}) {
	const account = context?.account || context?.target?.account || context || {};
	const targetUrl = resolveTargetUrl(account);
	const mediaPathRaw = resolveLocalMediaPath(post);
	const mediaPath =
		/^https?:\/\//i.test(mediaPathRaw || "")
			? await downloadRemoteMediaToTemp(mediaPathRaw)
			: mediaPathRaw;
	const config = resolveProfileConfig(account);
	const debug = createDebugRecorder(boolFromEnv("FACEBOOK_DEBUG", true));
	let browserContext = null;
	let cleanup = async () => {};
	let shouldCloseContext = true;
	let keepWindowOpen = false;

	if (config.useCdp) {
		const connected = await connectViaCdp(config);
		browserContext = connected.context;
		cleanup = connected.cleanup;
		shouldCloseContext = false;
	} else {
		const profile = await prepareChromeProfile(config);
		logStep("browser:launch", profile.launchUserDataDir);
		browserContext = await launchFacebookContextWithFallback(profile, config);
		cleanup = profile.cleanup;
	}

	try {
		logStep("page:open", targetUrl);
		const page = browserContext.pages()[0] || (await browserContext.newPage());
		await withStepTimeout("goto-target", () =>
			page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 }),
		);
		await page.waitForTimeout(2500);
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await dismissFacebookLoginOverlay(page);
		await dismissInterruptivePopups(page);
		let initialComposerSurface = await waitForFacebookComposerSurface(page, 9000);
		if (!initialComposerSurface) {
			logStep("surface:reload-for-composer");
			await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
			await page.waitForTimeout(2500);
			await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
			await dismissFacebookLoginOverlay(page);
			await dismissInterruptivePopups(page);
			initialComposerSurface = await waitForFacebookComposerSurface(page, 9000);
		}
		if (initialComposerSurface) {
			logStep("surface:composer-ready", initialComposerSurface);
		}
		logStep("page:url", page.url());
		await debug.log("page:open", { targetUrl, finalUrl: page.url() });
		await dumpFacebookSurface(page, "after-open");
		await debug.screenshot(page, "after-open");

		if (await pageLooksLikeAuthRequired(page)) {
			logStep("auth-required:auto-login", page.url());
			try {
				await ensureFacebookLoggedIn(page, debug);
			} catch (error) {
				keepWindowOpen = config.keepOpenOnAuthRequired && !config.useCdp;
				await debug.log("auth-required:error", {
					message: error?.message || String(error),
				});
				await debug.screenshot(page, "auth-required-error");
				throw error;
			}
			await dismissInterruptivePopups(page);
			await dismissFacebookLoginOverlay(page);
			await waitForFacebookComposerSurface(page, 12000).catch(() => null);
			logStep("auth-required:resolved", page.url());
			await dumpFacebookSurface(page, "after-auth");
			await debug.screenshot(page, "after-auth");
		}

		if (String(account?.metadata?.profileName || "").trim()) {
			const profileSwitchSelector = await switchFacebookProfile(
				page,
				account.metadata.profileName,
			);
			if (profileSwitchSelector) {
				logStep("profile-switch:clicked", profileSwitchSelector);
				await waitForFacebookComposerSurface(page, 12000).catch(() => null);
				await dumpFacebookSurface(page, "after-profile-switch");
			}
		}

		const switchSelector = await handlePageIdentitySwitch(page);
		if (switchSelector) {
			logStep("page-switch:clicked", switchSelector);
			logStep("page-switch:url", page.url());
			await dismissInterruptivePopups(page);
			await waitForFacebookComposerSurface(page, 12000).catch(() => null);
		}

		const facebookPostText = getFacebookPostText(post);
		if (!shouldSkipExistingFeedCheck()) {
		if (await verifyPostVisibleOnFeed(page, post)) {
			logStep("already-visible");
			return {
					type: "browser-post",
					via: config.useCdp ? "playwright-cdp" : "playwright",
					targetUrl,
					alreadyVisible: true,
				};
			}
		}

		logStep("composer:find");
		await dismissFacebookLoginOverlay(page);
		await dismissInterruptivePopups(page);
		await dumpFacebookSurface(page, "before-composer");
		await debug.screenshot(page, "before-composer");
		const composerSelector = await withStepTimeout("find-composer", () =>
			openFacebookComposer(page),
		);

		if (!composerSelector) {
			logStep("composer:missing");
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			await debug.screenshot(page, "composer-missing");
			throw new Error("Facebook browser fallback could not find the post composer");
		}
		logStep("composer:clicked", composerSelector);

		await page.waitForTimeout(1200);
		await dismissInterruptivePopups(page);

		logStep("composer:fill");
		const filled = await withStepTimeout("fill-composer", () =>
			fillComposer(page, facebookPostText),
		);
		if (!filled) {
			logStep("composer:fill-missing");
			await debug.screenshot(page, "composer-fill-missing");
			throw new Error("Facebook browser fallback could not fill the post body");
		}
		logStep("composer:filled", filled);

		if (mediaPath) {
			logStep("media:attach", mediaPath);
			const attached = await withStepTimeout("attach-media", () =>
				attachMedia(page, mediaPath),
			);
			if (!attached) {
				logStep("media:missing");
				await debug.screenshot(page, "media-missing");
				throw new Error("Facebook browser fallback could not attach media");
			}
			logStep("media:attached", attached);
			await page.waitForTimeout(2500);
			await dismissInterruptivePopups(page);
		}

		logStep("post-button:find");
		const publishSignalBaseline = await getPublishSignalCount(page);
		const postButtonSelector = await withStepTimeout("find-post-button", () =>
			clickFacebookSubmitButton(page),
		);

		if (!postButtonSelector) {
			logStep("post-button:missing");
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			await debug.screenshot(page, "post-button-missing");
			throw new Error("Facebook browser fallback could not find the Post button");
		}
		logStep("post-button:clicked", postButtonSelector);

		if (String(postButtonSelector).includes("Next")) {
			await page.waitForTimeout(5000);
			await dismissInterruptivePopups(page);
			const finalPostButtonSelector = await withStepTimeout(
				"find-final-post-button",
				async () => {
					for (let attempt = 0; attempt < 20; attempt += 1) {
						const clicked = await clickFacebookFinalPostButton(page);
						if (clicked) return clicked;
						await page.waitForTimeout(1500);
					}
					return null;
				},
				45000,
			);
			if (
				!finalPostButtonSelector ||
				String(finalPostButtonSelector).includes("Next")
			) {
				// Last-resort keyboard submit in dialog composer
				const composer = page
					.locator('div[role="dialog"] [contenteditable="true"], div[role="dialog"] textarea')
					.first();
				if ((await composer.count().catch(() => 0)) > 0) {
					await composer.click({ timeout: 3000 }).catch(() => {});
					await page.keyboard.press("Meta+Enter").catch(() => {});
					await page.keyboard.press("Control+Enter").catch(() => {});
					await page.waitForTimeout(1500);
				}
			}
			if (
				!finalPostButtonSelector ||
				String(finalPostButtonSelector).includes("Next")
			) {
				keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
				logStep("post-button:final-missing");
				await debug.screenshot(page, "final-post-button-missing");
				throw new Error(
					"Facebook browser fallback advanced with Next, but could not find the final Post button.",
				);
			}
			logStep("post-button:final-clicked", finalPostButtonSelector);
		}

		let pageClosedAfterSubmit = false;
		try {
			await page.waitForTimeout(2000);
		} catch (error) {
			if (isClosedTargetError(error)) {
				pageClosedAfterSubmit = true;
				logStep("post-submit:page-closed-after-click");
			} else {
				throw error;
			}
		}
		let submitted = false;
		if (!pageClosedAfterSubmit) {
			try {
				submitted = await confirmPostSubmitted(page);
			} catch (error) {
				if (isClosedTargetError(error)) {
					pageClosedAfterSubmit = true;
					submitted = true;
					logStep("post-submit:page-closed-during-confirm");
				} else {
					throw error;
				}
			}
		} else {
			submitted = true;
		}
		if (!submitted) {
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			logStep("post-submit:not-confirmed");
			await debug.screenshot(page, "post-submit-not-confirmed");
			throw new Error(
				"Facebook browser fallback clicked Post, but the composer did not close.",
			);
		}
		let publishSeen = false;
		if (!pageClosedAfterSubmit) {
			try {
				publishSeen = await waitForPublishSignal(page, publishSignalBaseline);
			} catch (error) {
				if (isClosedTargetError(error)) {
					pageClosedAfterSubmit = true;
					logStep("post-submit:page-closed-during-publish-wait");
				} else {
					throw error;
				}
			}
		}
		let feedVisible = false;
		if (!publishSeen) {
			if (!pageClosedAfterSubmit) {
				feedVisible = await verifyPostVisibleOnFeed(page, post);
			}
			if (pageClosedAfterSubmit) {
				logStep("post-submit:assuming-success-after-page-close");
				feedVisible = true;
			}
			if (feedVisible) {
				logStep(
					pageClosedAfterSubmit
						? "done:page-closed-after-submit"
						: "done:feed-visible-no-signal",
				);
			} else {
				keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
				logStep("post-submit:no-publish-signal");
				throw new Error(
					"Facebook browser fallback did not detect a publish confirmation signal.",
				);
			}
		} else {
			if (!pageClosedAfterSubmit) {
				feedVisible = await verifyPostVisibleOnFeed(page, post);
			} else {
				feedVisible = true;
			}
		}
		if (!feedVisible) {
			keepWindowOpen = config.keepOpenOnPostFailure && !config.useCdp;
			logStep("post-submit:not-found-on-feed");
			await debug.screenshot(page, "post-not-found-on-feed");
			throw new Error(
				"Facebook browser fallback could not verify the new post on feed after publish.",
			);
		}
		const manualShareMode = shouldUseManualShareMode();
		let shareResults = [];
		if (manualShareMode) {
			keepWindowOpen = !config.useCdp;
			logStep("share:manual-mode", "window-left-open-for-manual-share");
			await debug.log("share:manual-mode", {
				ok: true,
				message: "Browser left open for manual share after successful post",
			});
		} else {
			shareResults = await sharePostToConfiguredAccounts(page, post, account);
		}
		await debug.log("post-success", {
			finalUrl: page.url(),
			manualShareMode,
			shareResults,
		});
		await page.waitForTimeout(POST_SETTLE_MS);
		logStep("done");
		await debug.flush();

		return {
			type: "browser-post",
			via: config.useCdp ? "playwright-cdp" : "playwright",
			targetUrl,
			composerSelector,
			postButtonSelector,
			manualShareMode,
			shareResults,
		};
	} finally {
		logStep("cleanup", shouldCloseContext && !keepWindowOpen ? "close" : "keep-open");
		await debug.flush().catch(() => {});
		if (shouldCloseContext && !keepWindowOpen) {
			await settleWithTimeout("context-close", browserContext.close());
		}
		await settleWithTimeout("profile-cleanup", cleanup());
	}
}
