const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');

const readdir = Promise.promisify(fs.readdir);

const RE_WORKER_JSON = /^worker-\d+\.json$/;

exports.getWorkerJson = (reportDir) => {
	return readdir(reportDir)
		.filter((file) => RE_WORKER_JSON.test(file))
		.map((file) => path.join(reportDir, file));
};
