import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { getLocalDbPath, initLocalDb } from "../../utils/localDb.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTBOUND_BY_PIN = new Map([
	["goblinslow001", 1],
	["kawaii001", 1],
	["lighting001", 1],
	["parent001", 1],
	["password001", 1],
	["bobbin001", 1],
]);

async function main() {
	await initLocalDb();
	const db = new Database(getLocalDbPath());
	const rows = db
		.prepare("SELECT id, payload FROM pinterest_metrics_snapshots ORDER BY id ASC")
		.all();

	let updated = 0;
	const updateStmt = db.prepare(
		"UPDATE pinterest_metrics_snapshots SET payload = ?, created_at = ? WHERE id = ?",
	);

	for (const row of rows) {
		const payload = JSON.parse(row.payload);
		const pinId = String(payload?.pinId || "");
		if (!OUTBOUND_BY_PIN.has(pinId)) continue;
		const nextOutbound = OUTBOUND_BY_PIN.get(pinId);
		payload.metrics = {
			...(payload.metrics || {}),
			outboundClicks: nextOutbound,
		};
		updateStmt.run(JSON.stringify(payload), payload.capturedAt || new Date().toISOString(), row.id);
		updated += 1;
	}

	const verifyRows = db
		.prepare("SELECT payload FROM pinterest_metrics_snapshots ORDER BY id DESC LIMIT 20")
		.all()
		.map((row) => JSON.parse(row.payload));
	const totalOutboundClicks = verifyRows.reduce(
		(sum, entry) => sum + Number(entry?.metrics?.outboundClicks || 0),
		0,
	);

	console.log(
		JSON.stringify(
			{
				updated,
				totalOutboundClicks,
				rows: verifyRows.map((entry) => ({
					pinId: entry.pinId,
					title: entry.title,
					outboundClicks: entry?.metrics?.outboundClicks || 0,
				})),
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
