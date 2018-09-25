const Promise = require('bluebird');
const child_process = require('child_process');
const {Cli: CucumberCli} = require('cucumber');
const ArgvParser = require('cucumber/lib/cli/argv_parser').default;
const cucumberVersion = require('cucumber/package.json').version;
const EventEmitter = require('events');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const {getWorkerJson} = require('./util');

const IS_WINDOWS = process.platform === 'win32';

const ROUNDROBIN = 'roundrobin';
const UNIFORM = 'uniform';

const CUCUMBER_JS_PATH = process.env.CUCUMBER_JS_PATH ||
	(IS_WINDOWS ? 'node_modules\\.bin\\cucumber-js.cmd' : 'node_modules/.bin/cucumber-js');
const NUM_WORKERS = parseInt(process.env.CUCUMBER_PARALLEL_WORKERS, 10) || 4;
const REPORT_DIR = process.env.CUCUMBER_PARALLEL_REPORT_DIR || 'reports';
const DISTRIBUTION = process.env.CUCUMBER_PARALLEL_DISTRIBUTION === UNIFORM ? UNIFORM : ROUNDROBIN;

const mkdir = Promise.promisify(fs.mkdir);
const unlink = Promise.promisify(fs.unlink);

async function main() {
	const features = await enumerateFeatures();
	const workerArgv = cleanupArgv(process.argv);
	await ensureReportDirectory();
	await deleteWorkerJson();
	const promises = await (DISTRIBUTION === UNIFORM ? uniform : roundrobin)(features, workerArgv);
	const [rejected] = _.partition(promises, (p) => p.isRejected());
	if (rejected.length) {
		console.error(`${rejected.length} workers had failures.`);
		process.exit(2);
	}
}

async function enumerateFeatures() {
	console.log(`Cucumber version: ${cucumberVersion}`);
	const cli = new CucumberCli({
		argv: process.argv,
		cwd: process.cwd(),
		stdout: process.stdout
	});
	const configuration = await cli.getConfiguration();

	if (/^2/.test(cucumberVersion)) {
		const ScenarioFilter = require('cucumber/lib/scenario_filter').default;
		const {getFeatures} = require('cucumber/lib/cli/helpers');
		const {
			featurePaths,
			scenarioFilterOptions
		} = configuration;
		const scenarioFilter = new ScenarioFilter(scenarioFilterOptions);
		return getFeatures({
			featurePaths,
			scenarioFilter
		}).map(f => f.uri);
	} else { // Cucumber 3
		const PickleFilter = require('cucumber/lib/pickle_filter').default;
		const {getTestCasesFromFilesystem} = require('cucumber/lib/cli/helpers');
		const eventBroadcaster = new EventEmitter();
		const {
			featurePaths,
			pickleFilterOptions
		} = configuration;
		const pickleFilter = new PickleFilter(pickleFilterOptions);
		const testCases = await getTestCasesFromFilesystem({
			cwd: cli.cwd,
			eventBroadcaster,
			featurePaths,
			order: 'defined',
			pickleFilter
		});
		const features = new Set(testCases.map(t => t.uri));
		return [...features.values()];
	}
}

async function uniform(features, argv) {
	return Promise.map(
		distributeFeatures(features),
		(chunk, index) => spawnWorker(chunk, argv, path.join(REPORT_DIR, `worker-${index}.json`)).reflect()
	);
}

async function roundrobin(features, argv) {
	console.log(`Doling out ${features.length} features across ${NUM_WORKERS} workers as they are available.`);
	const queue = [...features];
	const promises = [];
	let index = 0;
	const runPipeline = () => {
		// keep taking features until the queue is empty
		if (queue.length) {
			const feature = queue.shift();
			console.log(`${queue.length} features remaining`);
			const reflection = spawnWorker([feature], argv, path.join(REPORT_DIR, `worker-${index++}.json`)).reflect();
			promises.push(reflection);
			return reflection.then(runPipeline);
		}
	}
	// wait for all worker pipelines to run their courses
	await Promise.map(Array(NUM_WORKERS), runPipeline);
	// resolve promise reflections
	return Promise.all(promises);
}

/**
 * Trim 'node ./index.js' and feature arguments.
 * Wrap each argument in single quotes to preserve spaces.
 */
function cleanupArgv(argv) {
	const argSet = new Set(ArgvParser.parse(argv).args);
	return argv.slice(2)
		.filter(arg => !argSet.has(arg))
		.map(arg => `'${arg}'`);
}

async function ensureReportDirectory() {
	const reportDir = path.resolve(REPORT_DIR);
	try {
		await mkdir(reportDir);
	} catch (error) {
		// already exists
	}
}

async function deleteWorkerJson() {
	const reportDir = path.resolve(REPORT_DIR);
	const workerJson = await getWorkerJson(reportDir);
	return Promise.map(workerJson, (file) => unlink(file));
}

/**
 * Bucket features based on NUM_WORKERS
 */
function distributeFeatures(features) {
	const size = Math.ceil(features.length / NUM_WORKERS);
	const chunks = _.chunk(features, size).filter((c) => c.length);
	console.log(`Splitting ${features.length} features into ${chunks.length} groups of ${size}.`);
	return chunks;
}

function spawnWorker(features, argv, outfile) {
	// If argv targets specific scenario lines within these features,
	// go with those instead of running the features entirely.
	const expandedFeatures = _.flatMap(features, feature => {
		const argMatches = process.argv.filter(arg => arg.includes(feature));
		if (argMatches.length > 0) {
			return argMatches;
		}
		return feature;
	});
	return new Promise((resolve, reject) => {
		const worker = child_process.spawn(CUCUMBER_JS_PATH, [
			...argv,
			'--format', `json:${outfile}`,
			...expandedFeatures
		]);
		let stderrBuffer = '';
		let stdoutBuffer = '';
		worker.stderr.on('data', (data) => {
			stderrBuffer += data;
		});
		worker.stdout.on('data', (data) => {
			stdoutBuffer += data;
		});
		worker.on('error', (error) => {
			reject(error);
		});
		worker.on('exit', (code, signal) => {
			if (code) {
				reject(new WorkerError(`worker exited with code ${code}`, code, stderrBuffer, stdoutBuffer));
			} else {
				resolve([stdoutBuffer, stderrBuffer]);
			}
		});
	})
	.tap(([stdout, stderr]) => {
		console.log(stdout);
	})
	.catch((error) => {
		if (error.stdout) {
			console.log(error.stdout);
		}
		if (error.stderr) {
			console.error(error.stderr);
		}
		console.error(error.stack);
		throw error;
	});
}

class WorkerError extends Error {
	constructor(message, code, stderr, stdout) {
		super(...arguments);
		this.code = code;
		this.stderr = stderr;
		this.stdout = stdout;
	}
}

module.exports = function () {
	main().catch((error) => {
		console.error(error.stack);
		process.exit(1);
	});
};

if (require.main === module) {
	module.exports();
}
