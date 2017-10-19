require('chromedriver');
const {defineSupportCode} = require('cucumber');
const seleniumWebdriver = require('selenium-webdriver');

function World() {
	this.driver = new seleniumWebdriver.Builder()
		.forBrowser('chrome')
		.build();
}

defineSupportCode(function({setWorldConstructor}) {
	setWorldConstructor(World);
});
