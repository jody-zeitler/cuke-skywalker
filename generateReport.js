const Promise = require('bluebird');
const reporter = require('cucumber-html-reporter');
const fs = require('fs');
const path = require('path');
const {getWorkerJson} = require('./util');

const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);

const PLATFORM = process.env.PLATFORM || 'NOT SET';
const ENVIRONMENT = process.env.ENVIRONMENT || 'NOT SET';
const SNAPSHOT = process.env.SNAPSHOT_ID || 'NOT SET';
const REPORT_DIR = process.env.CUCUMBER_PARALLEL_REPORT_DIR || './reports';
const METADATE = new Date().toISOString();

async function main() {
	try {
		const reportDir = path.resolve(REPORT_DIR);
		const combinedFile = path.join(reportDir, 'combined.json');
		const outputFile = path.join(reportDir, 'lastrun.html');

		// Grab all JSON files
		const combinedJson = await getWorkerJson(reportDir)
			.map(async (file) => JSON.parse(await readFile(file, 'utf8')))
			.reduce((combined, json) => combined.concat(json), []);

		await writeFile(combinedFile, JSON.stringify(combinedJson, null, 2));

		reporter.generate({
			theme: 'bootstrap',
			jsonFile: combinedFile,
			output: outputFile,
			reportSuiteAsScenarios: true,
			launchReport: false,
			metadata: {
				"Test Environment": ENVIRONMENT,
				"Browser": PLATFORM,
				"Date": METADATE,
				"Snapshot": SNAPSHOT,

			}
		});
	} catch (error) {
		console.error(error.stack);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = main;
