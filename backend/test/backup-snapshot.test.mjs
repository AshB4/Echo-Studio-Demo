import test from "node:test";
import assert from "node:assert/strict";
import { selectRetentionNames, shouldExcludeBackupPath } from "../scripts/backup/snapshot.mjs";

test("backup snapshot excludes browser cache and model directories", () => {
	const excluded = [
		"backend/config/facebook-chrome-profile/Default/Cache",
		"backend/config/facebook-chrome-profile/Default/Code Cache",
		"backend/config/facebook-chrome-profile/Default/GPUCache",
		"backend/config/facebook-chrome-profile/GraphiteDawnCache",
		"backend/config/facebook-chrome-profile/Default/ShaderCache",
		"backend/config/facebook-chrome-profile/GrShaderCache",
		"backend/config/facebook-chrome-profile/optimization_guide_model_store",
		"backend/config/facebook-chrome-profile/BrowserMetrics",
	];

	for (const item of excluded) {
		assert.equal(shouldExcludeBackupPath(item), true, item);
	}
});

test("backup snapshot keeps session and auth-bearing profile data", () => {
	const included = [
		"backend/config/facebook-chrome-profile/Default/Cookies",
		"backend/config/facebook-chrome-profile/Default/Local Storage",
		"backend/config/facebook-chrome-profile/Default/Session Storage",
		"backend/config/facebook-chrome-profile/Default/Login Data",
		"backend/config/facebook-chrome-profile/Default/Preferences",
		"backend/config/pinterest-state.json",
	];

	for (const item of included) {
		assert.equal(shouldExcludeBackupPath(item), false, item);
	}
});

test("backup retention keeps manual backups, newest week, and one monthly for three months", () => {
	const dirs = [
		"20260301-020000",
		"20260315-020000",
		"20260401-020000",
		"20260415-020000",
		"20260501-020000",
		"20260520-020000",
		"20260521-020000",
		"20260522-020000",
		"20260523-020000",
		"20260524-020000",
		"20260525-020000",
		"20260526-020000",
		"20260527-020000",
		"manual-2026-05-19",
	];

	const plan = selectRetentionNames(dirs, {
		dailyRetention: 7,
		monthlyRetention: 3,
	});

	assert.deepEqual(plan.keep, [
		"20260315-020000",
		"20260415-020000",
		"20260521-020000",
		"20260522-020000",
		"20260523-020000",
		"20260524-020000",
		"20260525-020000",
		"20260526-020000",
		"20260527-020000",
		"manual-2026-05-19",
	]);
	assert.deepEqual(plan.delete, [
		"20260301-020000",
		"20260401-020000",
		"20260501-020000",
		"20260520-020000",
	]);
});
