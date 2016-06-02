/**
 * popup.js
 */

var SAVING = false;
var WARNING = false;
var ENV = "tab"; // "win";
var QUEUE = [];
var ENQUEUED = [];
var FIRST = true;

// TODO: keep a history of tabs
var DEQUEUED = [];

// TODO: keep track if already saved (if (SAVED) {} else {})
var SAVED = false;


// TODO: fix tabs API, fix windows API, fix storage, fix context menu API
function main() {
    // Test
    chrome.tabs.executeScript(null, { file: "/content_scripts/test.js" });
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {testURL: "http://www.example.com"});
    });
    ENQUEUED.push(["New Tab","about:newtab"]);
    ENQUEUED.push(["Example Domain","http://www.example.com"]);


    // Initialize storage
    if (!ss.storage.windows) {
        ss.storage.windows = [];
    }
    ss.on("overQuota", function() { console.log("OVER QUOTA BY ", ss.quotaUsage, "%!")});

    // Initialize events
    initEvents();

    // Activate context menus
    // TODO: fix context menu API
    // TODO: add hotkeys (sdk)
	// TODO: support other node names (e.g. <A> links)
    function activateContextMenu(window) {
    	var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
	    var menu = window.document.getElementById("tabContextMenu");
	    var separator = window.document.createElementNS(XUL_NS, "menuseparator");
	    menu.insertBefore(separator, menu.firstChild);
	    var enqueue = window.document.createElementNS(XUL_NS, "menuitem");
	    enqueue.setAttribute("id", "contexttab-enqueue");
	    enqueue.setAttribute("label", "Enqueue tab");
	    var tab;
	    enqueue.addEventListener("command", function(event) {
	        if (!containsArray(ENQUEUED, tab)) {
	            ENQUEUED.push(tab);
	        }
	    });
	    menu.insertBefore(enqueue, menu.firstChild);
	    window.oncontextmenu = function(event) {
	        if (event.target.nodeName == "tab") {
	            tab = [event.target.label, getBrowserForTab(event.target).contentDocument.location.href];
	        }
	    }
    }
	activateContextMenu(getMostRecentBrowserWindow());
    allWindows.on("open", function(browserWindow) {
        activateContextMenu(viewFor(browserWindow));
    });

    // Show popup
    // TODO: add event listener
    // TODO: add clear button
    showEnv();

    // Hide popup
    // TODO: add event listener
    if (SAVING) {
        addOrRemoveForm(tabs);
    }
}
main();



function initEvents() {
	var tab = document.getElementById("tab");
    tab.addEventListener("click", function(event) {
        handleWarnings();
        if (ENV == "win") {
            switchEnv();
        }
    });

    var win = document.getElementById("win");
    win.addEventListener("click", function(event) {
        handleWarnings();
        if (ENV == "tab") {
            switchEnv();
        }
    });

    var menu = document.getElementById("menu");
    menu.addEventListener("click", function(event) {
        if (menu.classList.contains("menu-selected")) {
            menu.classList.remove("menu-selected");
            menu.classList.add("menu-not-selected");
            document.getElementById(ENV + "menu").style.display = "none";
        }
        else {
            menu.classList.remove("menu-not-selected");
            menu.classList.add("menu-selected");
            document.getElementById(ENV + "menu").style.display = "block";
        }
    });

    // var doc = document;
    // doc.addEventListener("click", function(event) {
    //     console.log(event.currentTarget);
    // });

    // var autosave = document.getElementById("autosave");
    // autosave.addEventListener("click", function(event) {
    //     handleWarnings();
    //     if (autosave.classList.contains("selected")) {
    //         autosave.classList.remove("selected");
    //     }
    //     else {
    //         autosave.classList.add("selected");
    //     }
    // });

    // TODO: fix bookmarks API
    var bookmark = document.getElementById("bookmark");
    bookmark.addEventListener("click", function(event) {
        handleWarnings();
        var bookmarks = [];
	    for (let tab of getSelectedTabs()) {
	        bookmarks.push(Bookmark({ title: tab[0], url: tab[1], group: UNSORTED }));
	    }
	    save(bookmarks).on("end", function() {
	        // console.log("Done.");
	    });
    });

    var openTab = document.getElementById("opentab");
    openTab.addEventListener("click", function(event) {
        handleWarnings();
        // don't activate, don't open in new window
        openOrActivateTabs(getSelectedTabs(), false, false);
    });

    var saveTab = document.getElementById("savetab");
    saveTab.addEventListener("click", function(event) {
        if (document.getElementById("form")) {
        	// if already saving, just undo save
        	addOrRemoveForm(tabs);
        }
        else {
            saveTabs(getSelectedTabs());
        }
    });

    var openWin = document.getElementById("openwin");
    openWin.addEventListener("click", function(event) {
        handleWarnings();
        // don't activate, don't open in new window
        openOrActivateTabs(getSelectedTabs(), false, false);
    });

    var openNewWin = document.getElementById("opennewwin");
    openNewWin.addEventListener("click", function(event) {
        handleWarnings();
        // don't activate, open in new window
        openOrActivateTabs(getSelectedTabs(), false, true);
    });

    // TODO: fix active window tabs
    // if activeWindow is deprecated at some point, instead use 
    // getMostRecentBrowserWindow().gBrowser.tabs; which uses a 
    // NodeList of <tab.tabbrowser-tab> instances
    // tabs.push([tab.label,getBrowserForTab(tab).contentDocument.location.href]);
    var saveWin = document.getElementById("savewin");
    saveWin.addEventListener("click", function(event) {
        if (document.getElementById("form")) {
        	// if already saving, just undo save
        	addOrRemoveForm(tabs);
        }
        else {
            chrome.tabs.executeScript(null, { file: "/content_scripts/content.js" });
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {getWindowTabs: true}, function(response) {
                    saveTabs(response.tabs);
                });
            });
        }
    });

    // var saveCurrent = document.getElementById("saveCurrent");
    // saveCurrent.addEventListener("click", function(event) {
    //     handleWarnings();
    // 
    // });

    // var export = document.getElementById("export");
    // export.addEventListener("click", function(event) {
    //     handleWarnings();
    //     
    // });
}

function switchEnv() {
    var oldEnv = ENV;
    if (oldEnv == "tab") {
        ENV = "win";
    }
    else {
        ENV = "tab";
    }
    document.getElementById(oldEnv).className = "env-not-selected";
    document.getElementById(oldEnv + "menu").style.display = "none";
    document.getElementById(oldEnv + "list").style.display = "none";
    document.getElementById(ENV).className = "env-selected";
    document.getElementById(ENV + "menu").style.display = "";
    document.getElementById(ENV + "list").style.display = "";
    showEnv();
}

function showEnv() {
    handleWarnings();
    if (ENV == "tab") {
        for (let tab of ENQUEUED) {
            if (!containsArray(QUEUE, tab)) {
                document.getElementById("tablist").appendChild(addTab(tab));
                QUEUE.push(tab);
            }
        }
        ENQUEUED = [];
    }
    else {
        if (FIRST) {
            for (let win of ss.storage.windows) {
                document.getElementById("winlist").appendChild(addWindow(win));
            }
        }
        FIRST = false;
    }
}

// TODO: add cancel button
// TODO: if panel hides, then cancel
function saveTabs(tabs) {
	SAVING = true;
    if (enoughSpace()) {
        handleWarnings();

        if (ENV == "tab") {
            switchEnv();
        }

        var list = document.getElementById("winlist");
        var item = addWindow(["", tabs]);
        // add form
        addOrRemoveForm(tabs);
        item.firstChild.childNodes[2].appendChild(document.getElementById("form"));
        list.insertBefore(item, list.firstChild.nextSibling.nextSibling);
    }
    else {
        if (!WARNING) {
            var warning = document.createElement("div");
            warning.id = "warning";
            warning.className = "warning";
            warning.textContent = "Not enough space to save window!";
            document.body.insertBefore(warning, document.getElementById("heading").nextSibling);
            WARNING = true;
        }
    }
}

// TODO: fix storage
// TODO: verify accuracy of quota usage percentage
// TODO: calculate space needed by current window
function enoughSpace() {
    if (ss.quotaUsage < 0.9) {
        return true;
    }
    return false;
}

function addOrRemoveForm(tabs) {
	var form = document.getElementById("form");

	// TODO: fix storage
	var handleSubmit = function(event) {
        var title = document.getElementById("title").value;
        form.parentNode.textContent = title;
        form.parentNode.removeChild(form);
        
        ss.storage.windows.push(win);
    	SAVING = false;
    };

	if (form) {
		form.removeEventListener("submit", handleSubmit);
        var item = form.parentNode.parentNode.parentNode;
        item.parentNode.removeChild(item);
	}
    else {
	    form = document.createElement("form");
	    form.id = "form";
	    var text = document.createElement("input");
	    text.type = "text";
	    text.id = "title";
	    text.style = "width: 50%;";
	    form.appendChild(text);
	    var submit = document.createElement("input");
	    submit.type = "submit";
	    submit.value = "Done";
	    form.appendChild(submit);

	    form.addEventListener("submit", handleSubmit);
    }
}

function addTab(tab) {
    var template = document.getElementById("tab-item");
    var item = template.cloneNode(true);
    item.removeAttribute("id");
    item.removeAttribute("style");
    item.href = tab[1];
    item.firstChild.firstChild.textContent = tab[0];
    item.firstChild.lastChild.textContent = "(" + tab[1] + ")";

    // remove tab
    item.lastChild.addEventListener("click", function(event) {
        handleWarnings();
        for (var i=0; i<QUEUE.length; i++) {
	        if (QUEUE[i][1] == tab[1]) {
	            QUEUE.splice(i, 1);
	            break;
	        }
	    }
        item.parentNode.removeChild(item);
    });

    if (item) {
        selectLink(item);
    }
    return item;
}

function addWindow(win) {
    var title = win[0];
    var tabs = win[1];

    var template = document.getElementById("win-item");
    var item = template.cloneNode(true);
    item.removeAttribute("id");
    item.removeAttribute("style");
    item.firstChild.childNodes[2].textContent = title;

    for (var i=0; i<tabs.length; i++) {
        item.appendChild(addTab(tabs[i]));
    }

    // remove window
    item.firstChild.childNodes[3].addEventListener("click", function(event) {
        handleWarnings();

        // title populated in item
        if (title == "") {
            title = item.firstChild.childNodes[2].textContent;
        }

        // TODO: fix storage
        var wins = ss.storage.windows;
	    for (var i=0; i<wins.length; i++) {
	        if (wins[i][0] == title) {
	            ss.storage.windows.splice(i, 1);
	            break;
	        }
	    }

        item.parentNode.removeChild(item);
        event.stopPropagation();
    });

    item.firstChild.childNodes[4].addEventListener("click", function(event) {
        handleWarnings();
        // don't activate, open in new window
        openOrActivateTabs(tabs, false, true);
        event.stopPropagation();
    });

    prepareList(item);
    return item;
}

function selectLink(link) {
    link.addEventListener("click", function(event) {
        if (link.classList.contains("selected")) {
            if (ENV == "win") {
                link.parentNode.firstChild.classList.remove("selected");
            }
            link.classList.remove("selected");
        }
        else {
            link.classList.add("selected");
        }
    });
}

function selectWindow(item) {
    var win = item.firstChild;
    win.addEventListener("click", function(event) {
        var children = win.parentNode.childNodes;
        if (win.classList.contains("selected")) {
            win.classList.remove("selected");

            for (var i=1; i<children.length; i++) {
                children[i].classList.remove("selected");
            }
        }
        else {
            win.classList.add("selected");

            for (var i=1; i<children.length; i++) {
                children[i].classList.add("selected");
            }
        }
    });
}

function openOrActivateTabs(tabs, activate, newWindow) {
    if (tabs.length > 0) {
        if (newWindow) {
            openInWindow(tabs);
            return;
        }
        // TODO: only activate tabs on the active window
        for (let tab of tabs) {
            var url = tab[1];
            var done = false;
            if (activate == true) {
                for (let currentTab of allTabs) {
                    if (currentTab.url == url) {
                        currentTab.activate();
                        done = true;
                        break;
                    }
                }
            }
            if (done == false) {
                allTabs.open(url);
            }
        }
    }
}

// TODO: fix tabs API
// openTab ensures that tabs are opened in the new window,
// rather than in the active window
function openInWindow(tabs) {
    allWindows.open({
        url: tabs[0][1],
        onOpen: function(win) {
            var domWin = viewFor(win);
            win.tabs[0].on("ready", function() {
                for (var i=1; i<tabs.length; i++) {
                    openTab(domWin, tabs[i][1]);
                }
            });
        }
    });
}

function getSelectedTabs() {
    var tabs = new Set(); // only unique tabs
    var selectTabs = function(items) {
        // exclude first item, which is template for tablist and win for win-item
        for (var i=1; i<items.length; i++) {
            var item = items[i];
            if (item.classList.contains("selected")) {
                tabs.add([item.firstChild.firstChild.textContent, item.href]);
            }
        }
    }
    if (ENV == "tab") {
        // excludes text and comment nodes
        selectTabs(document.getElementById("tablist").children);
    }
    else {
        var items = document.getElementById("winlist").children;
        // exclude first item, which is template
        for (var i=1; i<items.length; i++) {
            selectTabs(items[i].children);
        }
    }
    return Array.from(tabs);
}

function handleWarnings() {
    var menu = document.getElementById("menu");
    if (menu.classList.contains("menu-selected")) {
        menu.classList.remove("menu-selected");
        menu.classList.add("menu-not-selected");
        document.getElementById(ENV + "menu").style.display = "none";
    }

    if (WARNING) {
        document.body.removeChild(document.getElementById("warning"));
        WARNING = false;
    }
}

function hideChildren(parent) {
    var children = parent.childNodes;
    for (var i=0; i<children.length; i++) {
        var child = children[i];
        if (child.tagName == "LI") {
            child.style.display = "none";
        }
    }
}

function showChildren(parent) {
    var children = parent.childNodes;
    for (var i=0; i<children.length; i++) {
        var child = children[i];
        if (child.tagName == "LI") {
            child.style.display = "";
        }
    }
}

function createList(item) {
    var win = item.firstChild;
    var plus = win.firstChild;
    var minus = plus.nextSibling;
    plus.addEventListener("click", function(event) {
        showChildren(item);
        plus.style.display = "none";
        minus.style.display = "";
        event.stopPropagation();
    });
    minus.addEventListener("click", function(event) {
        hideChildren(item);
        minus.style.display = "none";
        plus.style.display = "";
        event.stopPropagation();
    });
    hideChildren(item);
    minus.style.display = "none";
}

function createMenuList(item) {
    var win = item.firstChild;
    var greaterThan = win.lastChild;
    var lessThan = greaterThan.previousSibling;
    lessThan.addEventListener("click", function(event) {
        showChildren(win);
        lessThan.style.display = "none";
        greaterThan.style.display = "";
        event.stopPropagation();
    });
    greaterThan.addEventListener("click", function(event) {
        hideChildren(win);
        greaterThan.style.display = "none";
        lessThan.style.display = "";
        event.stopPropagation();
    });
    hideChildren(win);
    greaterThan.style.display = "none";
}

function prepareList(item) {
    if (item) {
        createList(item);
        createMenuList(item);
        selectWindow(item);
    }
}



// Utility functions

function containsArray(bigArray, smallArray) {
    for (let item of bigArray) {
        var contains = true;
        for (var i=0; i<smallArray.length; i++) {
            if (item[i] != smallArray[i]) {
                contains = false;
                break;
            }
        }
        if (contains == true) {
            return true;
        }
    }
    return false;
}