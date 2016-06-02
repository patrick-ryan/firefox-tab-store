/**
 * test.js
 */

function test(request, sender, sendResponse) {
	chrome.tabs.create({ url: request.testURL });
	chrome.runtime.onMessage.removeListener(test);
}


chrome.runtime.onMessage.addListener(test);