/**
 * content.js
 */

function main(request, sender, sendResponse) {
	if (request.getWindowTabs) {
		var tabsList = [];
		for (let tab in activeTabs) {
			tabsList.push([tab.title, tab.url]);
		}
		sendResponse({tabs: tabsList});
	}
	chrome.runtime.onMessage.removeListener(main);
	return true;
}


chrome.runtime.onMessage.addListener(main);