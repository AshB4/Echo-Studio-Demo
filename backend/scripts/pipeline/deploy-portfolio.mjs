import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import { initLocalDb, readStoreSnapshot, replaceStoreSnapshot } from "../../utils/localDb.mjs";
import { applyPipelineStatus, isArticleRecord } from "../../utils/articlePipeline.mjs";
import { generatePortfolio } from "./generate-portfolio.mjs";

const execFileAsync = promisify(execFile);

function argValue(name, fallback = null) {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match ? match.slice(prefix.length) : fallback;
}

function envValue(name, fallback = "") {
	const value = process.env[name];
	return value === undefined || value === null || value === "" ? fallback : value;
}

function boolArg(name) {
	return process.argv.includes(`--${name}`);
}

function portfolioRepoDir() {
	const configured =
		argValue("repo-dir") ||
		process.env.POSTPUNK_PORTFOLIO_REPO_DIR ||
		process.env.POSTPUNK_PORTFOLIO_OUT_DIR;
	if (!configured) {
		throw new Error("POSTPUNK_PORTFOLIO_REPO_DIR is required for portfolio deployment");
	}
	return path.resolve(configured);
}

async function runGit(args, cwd) {
	const { stdout, stderr } = await execFileAsync("git", args, { cwd });
	return `${stdout || ""}${stderr || ""}`.trim();
}

async function hasChanges(repoDir) {
	const output = await runGit(["status", "--porcelain"], repoDir);
	return output.length > 0;
}

async function markPortfolioDeployed(at) {
	await initLocalDb();
	const snapshot = await readStoreSnapshot();
	const posts = (snapshot.posts || []).map((post) =>
		isArticleRecord(post) ? applyPipelineStatus(post, "portfolio_deployed", at) : post,
	);
	await replaceStoreSnapshot({
		posts,
		postedLog: snapshot.postedLog || [],
		rejections: snapshot.rejections || [],
	});
}

export async function deployPortfolio(options = {}) {
	const repoDir = options.repoDir || portfolioRepoDir();
	const generatedAt = options.generatedAt || new Date().toISOString();
	const commitMessage =
		options.commitMessage ||
		argValue("message") ||
		envValue("POSTPUNK_PORTFOLIO_COMMIT_MESSAGE", "PostPunk portfolio article sync");
	const noPush = options.noPush ?? boolArg("no-push");

	const generated = await generatePortfolio({
		outDir: repoDir,
		generatedAt,
		persistStatus: true,
	});

	if (!(await hasChanges(repoDir))) {
		return {
			...generated,
			repoDir,
			committed: false,
			pushed: false,
			reason: "No portfolio changes to commit",
		};
	}

	await runGit(["add", "blog"], repoDir);
	await runGit(["commit", "-m", commitMessage], repoDir);
	if (!noPush) {
		await runGit(["push", "origin", "main"], repoDir);
		await markPortfolioDeployed(generatedAt);
	}

	return {
		...generated,
		repoDir,
		committed: true,
		pushed: !noPush,
	};
}

if (import.meta.url === `file://${process.argv[1]}`) {
	deployPortfolio()
		.then((result) => {
			const action = result.committed
				? result.pushed
					? "committed and pushed"
					: "committed without push"
				: result.reason;
			console.log(`Portfolio deployment complete: ${action}. ${result.publicArticleCount} public articles.`);
		})
		.catch((error) => {
			console.error("Portfolio deployment failed:", error?.message || error);
			process.exitCode = 1;
		});
}
