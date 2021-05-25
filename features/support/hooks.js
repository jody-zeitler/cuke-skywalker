const {defineSupportCode, Status} = require('@cucumber/cucumber');

defineSupportCode(function ({After}) {
	After({timeout: 10 * 1000}, async function ({result, status}) {
		status = status || result.status;
		if (status === Status.FAILED) {
			const screenshot = await this.driver.takeScreenshot();
			await this.attach(screenshot, 'image/png');
		}
		await this.driver.quit();
	});
});
