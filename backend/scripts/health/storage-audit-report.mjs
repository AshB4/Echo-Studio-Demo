/** @format */

import { readdir, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { sendPostPunkTelegramAlert } from "../../utils/telegramAlerts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const PROJECT_ROOT = path.join(BACKEND_ROOT, "..");

const TOP_LIMIT = 20;
const SKIP_DIR_NAMES = new Set([".git"]);
const BUILD_DIR_NAMES = new Set(["dist", "build", ".next", ".vite", "coverage", ".turbo"]);
const TEMP_DIR_NAMES = new Set(["tmp", "temp", "exports", "export", "debug"]);

function parseArgs(argv = process.argv.slice(2)) {
	const args = {
		send: false,
		root: PROJECT_ROOT,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--send") {
			args.send = true;
			continue;
		}
		if (arg === "--root") {
			args.root = path.resolve(argv[index + 1] || args.root);
			index += 1;
		}
	}
	return args;
}

function formatBytes(bytes = 0) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = Number(bytes) || 0;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
	return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function rel(root, target) {
	const relative = path.relative(root, target) || ".";
	return relative.split(path.sep).join("/");
}

function pathParts(filePath) {
	return filePath.split(path.sep).filter(Boolean).map((item) => item.toLowerCase());
}

function hasPathPart(filePath, partName) {
	return pathParts(filePath).includes(String(partName).toLowerCase());
}

function isBrowserProfileDir(dirPath) {
	const name = path.basename(dirPath).toLowerCase();
	return (
		name.includes("chrome-profile") ||
		name.includes("automation-profile") ||
		name.includes("browser-profile")
	);
}

function isNodeModulesDir(dirPath) {
	return path.basename(dirPath) === "node_modules";
}

function isBuildArtifactDir(dirPath) {
	return !hasPathPart(dirPath, "node_modules") && BUILD_DIR_NAMES.has(path.basename(dirPath).toLowerCase());
}

function isTemporaryExportDir(dirPath) {
	const name = path.basename(dirPath).toLowerCase();
	return (
		!hasPathPart(dirPath, "node_modules") &&
		!pathParts(dirPath).some((part) => part.includes("chrome-profile") || part.includes("automation-profile")) &&
		(TEMP_DIR_NAMES.has(name) || name.includes("export") || name.includes("tmp"))
	);
}

function sortDesc(rows) {
	return [...rows].sort((a, b) => b.size - a.size || a.path.localeCompare(b.path));
}

function sumRows(rows = []) {
	return rows.reduce((sum, row) => sum + (Number(row?.size) || 0), 0);
}

function findExactPath(rows = [], targetPath) {
	return rows.find((row) => row.path === targetPath) || null;
}

function findPathEnding(rows = [], suffix) {
	return rows.find((row) => row.path.endsWith(suffix)) || null;
}

function compactList(rows = [], limit = 5) {
	return rows
		.slice(0, limit)
		.map((row) => `- ${row.path}: ${formatBytes(row.size)}`);
}

async function scanTree(root) {
	const folders = [];
	const files = [];
	const browserProfiles = [];
	const nodeModules = [];
	const buildArtifacts = [];
	const temporaryExports = [];

	async function walk(dirPath) {
		let entries = [];
		try {
			entries = await readdir(dirPath, { withFileTypes: true });
		} catch {
			return 0;
		}

		let total = 0;
		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);
			if (entry.isSymbolicLink()) continue;
			if (entry.isDirectory()) {
				if (SKIP_DIR_NAMES.has(entry.name)) continue;
				const size = await walk(fullPath);
				total += size;
				const row = { path: rel(root, fullPath), size };
				folders.push(row);
				if (isBrowserProfileDir(fullPath)) browserProfiles.push(row);
				if (isNodeModulesDir(fullPath)) nodeModules.push(row);
				if (isBuildArtifactDir(fullPath)) buildArtifacts.push(row);
				if (isTemporaryExportDir(fullPath)) temporaryExports.push(row);
				continue;
			}
			if (!entry.isFile()) continue;
			try {
				const info = await stat(fullPath);
				total += info.size;
				files.push({ path: rel(root, fullPath), size: info.size });
			} catch {
				// File may have disappeared during the scan. Ignore it.
			}
		}
		return total;
	}

	const total = await walk(root);
	return {
		total,
		folders: sortDesc(folders),
		files: sortDesc(files),
		browserProfiles: sortDesc(browserProfiles),
		nodeModules: sortDesc(nodeModules),
		buildArtifacts: sortDesc(buildArtifacts),
		temporaryExports: sortDesc(temporaryExports),
	};
}

function section(title, rows, limit = TOP_LIMIT) {
	if (!rows.length) return [`${title}: none`];
	return [
		`${title}:`,
		...rows.slice(0, limit).map((row, index) => `${index + 1}. ${formatBytes(row.size)} ${row.path}`),
	];
}

function buildReportParts(scan, root) {
	return [
		[
			"Storage Audit Report",
			`Root: ${root}`,
			`Generated: ${new Date().toISOString()}`,
			`Total repo size: ${formatBytes(scan.total)}`,
		].join("\n"),
		section("Top 20 folders by size", scan.folders).join("\n"),
		section("Top 20 files by size", scan.files).join("\n"),
		section("Browser profiles", scan.browserProfiles).join("\n"),
		section("Node modules", scan.nodeModules).join("\n"),
		section("Build artifacts", scan.buildArtifacts).join("\n"),
		section("Temporary exports", scan.temporaryExports).join("\n"),
	];
}

function buildReport(scan, root) {
	return buildReportParts(scan, root).join("\n\n");
}

function buildHumanSummaryParts(scan, root) {
	const topFolder = scan.folders[0] || null;
	const topFile = scan.files[0] || null;
	const backups = findExactPath(scan.folders, "backend/backups");
	const apiErrLog = findExactPath(scan.files, "backend/api.err.log");
	const backendNodeModules = findExactPath(scan.nodeModules, "backend/node_modules");
	const frontendNodeModules = findExactPath(scan.nodeModules, "frontend/node_modules");
	const frontendDist = findExactPath(scan.buildArtifacts, "frontend/dist");
	const backendDebug = findExactPath(scan.temporaryExports, "backend/debug");
	const backendTmp = findExactPath(scan.temporaryExports, "backend/tmp");
	const facebookProfile =
		findExactPath(scan.browserProfiles, "backend/config/facebook-chrome-profile") ||
		findPathEnding(scan.browserProfiles, "facebook-chrome-profile");
	const pinterestProfile =
		findExactPath(scan.browserProfiles, "backend/config/pinterest-chrome-profile") ||
		findPathEnding(scan.browserProfiles, "pinterest-chrome-profile");
	const kofiProfile =
		findExactPath(scan.browserProfiles, "backend/config/kofi-chrome-profile") ||
		findPathEnding(scan.browserProfiles, "kofi-chrome-profile");

	const summary = [
		"Storage Audit Report",
		`Root: ${root}`,
		`Generated: ${new Date().toISOString()}`,
		`Total repo size: ${formatBytes(scan.total)}`,
		topFolder ? `Biggest folder: ${topFolder.path} (${formatBytes(topFolder.size)})` : null,
		backups ? `Biggest issue: backend/backups is ${formatBytes(backups.size)}` : null,
		backups
			? "Why it matters: backups are repeatedly copying browser profiles, which makes storage grow fast."
			: null,
		apiErrLog ? `Large log file: backend/api.err.log is ${formatBytes(apiErrLog.size)}` : null,
		topFile ? `Largest single file: ${topFile.path} (${formatBytes(topFile.size)})` : null,
	].filter(Boolean);

	const browserProfileLines = [
		`Browser profiles total in scan: ${formatBytes(sumRows(scan.browserProfiles))}`,
		facebookProfile ? `- Facebook profile: ${formatBytes(facebookProfile.size)}` : null,
		pinterestProfile ? `- Pinterest profile: ${formatBytes(pinterestProfile.size)}` : null,
		kofiProfile ? `- Ko-fi profile: ${formatBytes(kofiProfile.size)}` : null,
		"Note: if browser profiles show up inside backups, those backups are probably the storage problem.",
	].filter(Boolean);

	const dependencyLines = [
		`Node modules total in scan: ${formatBytes(sumRows(scan.nodeModules))}`,
		backendNodeModules ? `- Backend dependencies: ${formatBytes(backendNodeModules.size)}` : null,
		frontendNodeModules ? `- Frontend dependencies: ${formatBytes(frontendNodeModules.size)}` : null,
		"Interpretation: node_modules is normal and not the main problem unless disk gets very tight.",
	].filter(Boolean);

	const artifactLines = [
		`Build artifacts total in scan: ${formatBytes(sumRows(scan.buildArtifacts))}`,
		frontendDist ? `- Frontend build output: ${formatBytes(frontendDist.size)}` : null,
		scan.buildArtifacts.length ? null : "- No build artifact folders found.",
		`Temporary/debug total in scan: ${formatBytes(sumRows(scan.temporaryExports))}`,
		backendDebug ? `- Debug screenshots/log exports: ${formatBytes(backendDebug.size)}` : null,
		backendTmp ? `- Backend tmp: ${formatBytes(backendTmp.size)}` : null,
	].filter(Boolean);

	const topLines = [
		"Top folders to inspect:",
		...compactList(scan.folders, 8),
		"",
		"Top files to inspect:",
		...compactList(scan.files, 8),
	];

	return [
		summary.join("\n"),
		browserProfileLines.join("\n"),
		dependencyLines.join("\n"),
		artifactLines.join("\n"),
		topLines.join("\n"),
	];
}

async function main() {
	const args = parseArgs();
	const scan = await scanTree(args.root);
	const report = buildReport(scan, args.root);
	console.log(report);
	if (args.send) {
		for (const part of buildHumanSummaryParts(scan, args.root)) {
			const result = await sendPostPunkTelegramAlert(part);
			if (!result?.ok && !result?.skipped) {
				console.warn("Storage audit Telegram send failed:", result);
				process.exitCode = 1;
			}
			if (result?.skipped) {
				console.warn("Storage audit Telegram send skipped:", result);
				break;
			}
		}
	}
}

main().catch((error) => {
	console.error("Storage audit failed:", error?.stack || error?.message || error);
	process.exitCode = 1;
});
