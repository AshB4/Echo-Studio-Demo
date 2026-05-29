import test from "node:test";
import assert from "node:assert/strict";
import { shouldExcludeBackupPath } from "../scripts/backup/snapshot.mjs";

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
