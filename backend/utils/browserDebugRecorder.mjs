/** @format */

import path from "path";
import { mkdir, writeFile } from "fs/promises";

export function createBrowserDebugRecorder({
	enabled = false,
	debugDir = "",
	logPrefix = "BROWSER_DEBUG",
} = {}) {
	const events = [];
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const sessionDir = debugDir ? path.join(debugDir, stamp) : "";

	const ensureDir = async () => {
		if (!enabled || !sessionDir) return;
		await mkdir(sessionDir, { recursive: true });
	};

	const log = async (step, details = {}) => {
		const event = {
			at: new Date().toISOString(),
			step,
			...details,
		};
		events.push(event);
		if (enabled) {
			console.log(`[${logPrefix}] ${step}`, details);
		}
	};

	const screenshot = async (page, name, options = {}) => {
		if (!enabled || !page || !sessionDir) return "";
		await ensureDir();
		const safeName = String(name || "step").replace(/[^a-z0-9_-]+/gi, "-");
		const filePath = path.join(sessionDir, `${Date.now()}_${safeName}.png`);
		try {
			await page.screenshot({
				path: filePath,
				fullPage: false,
				timeout: 5000,
				animations: "disabled",
				...options,
			});
			return filePath;
		} catch (error) {
			events.push({
				at: new Date().toISOString(),
				step: "debug-screenshot-failed",
				name: safeName,
				error: error?.message || String(error),
			});
			console.warn(
				`[${logPrefix}] screenshot failed for ${safeName}:`,
				error?.message || String(error),
			);
			return "";
		}
	};

	const flush = async () => {
		if (!enabled || !sessionDir) return;
		await ensureDir();
		await writeFile(
			path.join(sessionDir, "events.json"),
			JSON.stringify(events, null, 2),
		);
	};

	return {
		enabled,
		sessionDir,
		log,
		screenshot,
		flush,
	};
}
