require('chromedriver');
const {defineSupportCode} = require('cucumber');
const seleniumWebdriver = require('selenium-webdriver');

function World({attach}) {
	this.driver = new seleniumWebdriver.Builder()
		.forBrowser('chrome')
		.build();
	this.attach = attach;
}

defineSupportCode(function({setWorldConstructor}) {
	setWorldConstructor(World);
});
