/** @format */

import { copyFile, mkdir, readdir, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "../..");
const SOURCE_DIRS = [
	path.join(BACKEND_ROOT, "queue"),
	path.join(BACKEND_ROOT, "media"),
	path.join(BACKEND_ROOT, "config"),
];
const BACKUP_ROOT = path.join(BACKEND_ROOT, "backups");
const DAILY_RETENTION = Number(process.env.POSTPUNK_BACKUP_DAILY_RETENTION || 7);
const MONTHLY_RETENTION = Number(process.env.POSTPUNK_BACKUP_MONTHLY_RETENTION || 3);
const EXCLUDED_DIR_NAMES = new Set([
	"Cache",
	"Code Cache",
	"GPUCache",
	"GraphiteDawnCache",
	"ShaderCache",
	"GrShaderCache",
	"optimization_guide_model_store",
	"BrowserMetrics",
]);

function stamp() {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	const hh = String(now.getHours()).padStart(2, "0");
	const mm = String(now.getMinutes()).padStart(2, "0");
	const ss = String(now.getSeconds()).padStart(2, "0");
	return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function parseSnapshotName(name) {
	const match = String(name || "").match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
	if (!match) return null;
	const [, year, month, day, hour, minute, second] = match;
	const date = new Date(
		Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)),
	);
	if (Number.isNaN(date.getTime())) return null;
	return {
		name,
		date,
		monthKey: `${year}-${month}`,
	};
}

function selectRetentionNames(dirNames, options = {}) {
	const dailyRetention = Math.max(0, Number(options.dailyRetention ?? DAILY_RETENTION));
	const monthlyRetention = Math.max(0, Number(options.monthlyRetention ?? MONTHLY_RETENTION));
	const keep = new Set();
	const snapshots = [];

	for (const name of dirNames) {
		const parsed = parseSnapshotName(name);
		if (!parsed) {
			keep.add(name);
			continue;
		}
		snapshots.push(parsed);
	}

	const newestFirst = snapshots.sort((a, b) => b.date - a.date || b.name.localeCompare(a.name));
	for (const snapshot of newestFirst.slice(0, dailyRetention)) {
		keep.add(snapshot.name);
	}

	const keptMonths = new Set();
	for (const snapshot of newestFirst) {
		if (keptMonths.has(snapshot.monthKey)) continue;
		keptMonths.add(snapshot.monthKey);
		if (keptMonths.size <= monthlyRetention) {
			keep.add(snapshot.name);
		}
		if (keptMonths.size >= monthlyRetention) break;
	}

	return {
		keep: [...keep].sort(),
		delete: dirNames.filter((name) => !keep.has(name)).sort(),
	};
}

async function enforceRetention() {
	const entries = await readdir(BACKUP_ROOT, { withFileTypes: true }).catch(() => []);
	const dirs = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const plan = selectRetentionNames(dirs);
	for (const dir of plan.delete) {
		await rm(path.join(BACKUP_ROOT, dir), { recursive: true, force: true });
	}
	return plan.delete.length;
}

function shouldExcludeBackupPath(sourcePath) {
	const parts = String(sourcePath || "").split(path.sep).filter(Boolean);
	return parts.some((part) => EXCLUDED_DIR_NAMES.has(part));
}

async function copyFiltered(source, target) {
	if (shouldExcludeBackupPath(source)) return { copiedFiles: 0, skippedDirs: 1 };

	const entries = await readdir(source, { withFileTypes: true });
	await mkdir(target, { recursive: true });
	let copiedFiles = 0;
	let skippedDirs = 0;

	for (const entry of entries) {
		const sourceChild = path.join(source, entry.name);
		const targetChild = path.join(target, entry.name);
		if (entry.isSymbolicLink()) continue;
		if (entry.isDirectory()) {
			if (shouldExcludeBackupPath(sourceChild)) {
				skippedDirs += 1;
				continue;
			}
			const result = await copyFiltered(sourceChild, targetChild);
			copiedFiles += result.copiedFiles;
			skippedDirs += result.skippedDirs;
			continue;
		}
		if (!entry.isFile()) continue;
		await copyFile(sourceChild, targetChild);
		copiedFiles += 1;
	}

	return { copiedFiles, skippedDirs };
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");
	await mkdir(BACKUP_ROOT, { recursive: true });
	const targetDir = path.join(BACKUP_ROOT, stamp());

	if (!dryRun) {
		await mkdir(targetDir, { recursive: true });
		let copiedFiles = 0;
		let skippedDirs = 0;
		for (const source of SOURCE_DIRS) {
			const name = path.basename(source);
			const result = await copyFiltered(source, path.join(targetDir, name));
			copiedFiles += result.copiedFiles;
			skippedDirs += result.skippedDirs;
		}
		const deleted = await enforceRetention();
		console.log(`Backup created: ${targetDir}`);
		console.log(`Copied files: ${copiedFiles}`);
		console.log(`Excluded cache/model dirs: ${skippedDirs}`);
		console.log(`Retention cleanup removed: ${deleted} old backup(s).`);
		return;
	}

	console.log(`Dry run backup target: ${targetDir}`);
	console.log(`Sources:`);
	for (const source of SOURCE_DIRS) {
		console.log(`- ${source}`);
	}
	console.log("Excluded directory names:");
	for (const name of EXCLUDED_DIR_NAMES) {
		console.log(`- ${name}`);
	}
	console.log(`Retention: keep newest ${DAILY_RETENTION} daily backups and one monthly backup for ${MONTHLY_RETENTION} month(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("Backup snapshot failed:", error?.message || error);
		process.exitCode = 1;
	});
}

export { EXCLUDED_DIR_NAMES, parseSnapshotName, selectRetentionNames, shouldExcludeBackupPath };
