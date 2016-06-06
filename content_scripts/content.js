/**
 * content.js
 */

function main(request, sender, sendResponse) {
	if (request.getWindowTabs) {
		var tabsList;
		chrome.tabs.query({currentWindow: true}, function(tabs) {
			// reduce tab objects to [id, title, url]
			tabsList = tabs.map(function(tab) { return [tab.id, tab.title, tab.url]; });
		});

		sendResponse({tabs: tabsList});
	}

	else if (request.createTabs) {
		for (let tabURL of request.tabURLs) {
			chrome.tabs.create({ url: tabURL });
		}
	}

	else if (request.activateTab) {
		chrome.tabs.update(request.tabID, {active: true});
	}

	chrome.runtime.onMessage.removeListener(main);
	return true;
}


chrome.runtime.onMessage.addListener(main);