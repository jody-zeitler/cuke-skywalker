const {defineSupportCode} = require('cucumber');
const seleniumWebdriver = require('selenium-webdriver');

defineSupportCode(function({Given, When, Then}) {
	When(/^I navigate to '([^']+)'$/, {timeout: 10 * 1000}, async function (url) {
		await this.driver.get(url);
	});

	Then(/^the Google logo is present$/, async function () {
		const css = 'img[alt="Google"]';
		const condition = seleniumWebdriver.until.elementLocated({css});
		await this.driver.wait(condition, 5000);
	});
});
