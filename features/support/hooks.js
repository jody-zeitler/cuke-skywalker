const {defineSupportCode, Status} = require('cucumber');

defineSupportCode(function ({After}) {
	After({timeout: 10 * 1000}, async function ({result}) {
		if (result.status === Status.FAILED) {
			const screenshot = await this.driver.takeScreenshot();
			await this.attach(screenshot, 'image/png');
		}
		await this.driver.quit();
	});
});
