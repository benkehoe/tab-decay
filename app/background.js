// Copyright 2022 Ben Kehoe
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var DISABLE_CLOSE = false;

function scheduleTab(tab, callback) {
    if (isSpecialTab(tab)) {
        console.log(`Tab ${tab.windowId}:${tab.id} ${tab.url} is a special tab, not scheduling`);
        return;
    }
    getSettings(function(settings) {
        console.log(`Scheduling tab ${tab.windowId}:${tab.id} ${tab.url}`);
        sampleForTab(tab, settings, function (lifetime) {
            scheduleTabForLifetime(tab, lifetime, callback);
        });
    });
}

function unscheduleTab(tab, callback) {
    console.log(`Unscheduling tab ${tab.windowId}:${tab.id} ${tab.url}`);
    processTabInfo(tab, function(tabInfo) {
        unsetTimer(tabInfo);
        if (callback) {
            callback();
        }
    });
}

function sampleForTab(tab, settings, callback) {
    console.log(`Sampling for tab ${tab.id}`);
    console.log(`Current settings:`)
    if (!settings) {
        console.log("None")
        callback(null);
        return;
    }
    console.log(JSON.stringify(settings))
    console.log(tab);
    if (tab.pendingUrl) {
        var url = tab.pendingUrl;
    } else {
        var url = tab.url;
    }
    var halflife = getHalflifeForUrl(url, settings);
    if (!halflife) {
        callback(null);
    } else {
        var halflifeMilliseconds = getMilliseconds(halflife);
        var sampledHalfLifeMilliseconds = sample(halflifeMilliseconds);
        callback(sampledHalfLifeMilliseconds);
    }
}

function getHalflifeForUrl(url, settings) {
    var domain = new URL(url).hostname;
    if (settings.sites) {
        for (const site of settings.sites) {
            var domain_matches = site.domain && site.domain != domain;
            var url_pattern_matches = site.url_pattern && domain.match(site.url_pattern);
            if (domain_matches || url_pattern_matches) {
                console.log(`Found site: ${JSON.stringify(site)}`);
                return {
                    "value": site.halflife,
                    "units": site.units
                }
            }
        }
    };
    return settings.default;
}

// Turn a halflife object with value and units into milliseconds
function getMilliseconds(halflife) {
    if (!halflife.value) {
        return undefined;
    }
    switch (halflife.units) {
        case "hours":
            return halflife.value          * 60 * 60 * 1000;
        case "days":
            return halflife.value     * 24 * 60 * 60 * 1000;
        case "weeks":
            return halflife.value * 7 * 24 * 60 * 60 * 1000;
        default:
            console.log("Half-life does not have units", halflife);
            return undefined;
    }
}

function sample(halflifeMilliseconds) {
    if (!halflifeMilliseconds) {
        return null;
    }
    rate = Math.log(2) / halflifeMilliseconds;
    var uniformSample = Math.random();
    var value = -Math.log(uniformSample)/rate;
    return value;
}

function scheduleTabForLifetime(tab, lifetime, callback) {
    var now = new Date;
    if (!lifetime) {
        console.log("No lifetime, skipping");
        if (callback) {
            callback();
        }
        return;
    }
    console.log(`Lifetime is ${lifetime/1000} seconds`);
    var death = new Date(now.getTime() + lifetime);
    console.log(`Death is ${death.toString()}`)

    processTabInfo(tab, function(tabInfo) {
        tabInfo.lifetime = lifetime;
        tabInfo.death = death.getTime();

        setTimer(tabInfo, lifetime, tab);
        return tabInfo;
    });
}

function processTabInfo(tab, tabInfoCallback, callback) {
    var tabIdString = tab.id.toString();
    chrome.storage.local.get([tabIdString], function(kv) {
        if (!kv[tabIdString]) {
            kv[tabIdString] = {};
        }
        var tabInfo = kv[tabIdString];
        tabInfo = tabInfoCallback(tabInfo);

        if (tabInfo != undefined) {
            kv[tabIdString] = tabInfo;

            chrome.storage.local.set(kv, function() {
                if (callback) {
                    callback();
                }
            });
        } else if (callback) {
            callback();
        }
    });
}

function setTimer(tabInfo, lifetime, tab) {
    if (tabInfo.timer) {
        clearTimeout(tabInfo.timer);
    }
    tabInfo.timer = setTimeout(function () {
        closeTab(tab.id);
    }, lifetime);
}

function unsetTimer(tabInfo) {
    if (tabInfo.timer) {
        clearTimeout(tabInfo.timer);
    }
}

function closeTab(tabId, callback) {
    chrome.tabs.get(tabId, function(tab) {
        if (!tab) {
            console.log(`Tab ${tabId} appears closed`);
            if (callback) {
                callback();
            }
            return;
        }
        if (tab.active) {
            console.log(`Tab ${tab.windowId}:${tab.id} ${tab.url} is active`);
            if (callback) {
                callback();
            }
            return;
        }
        getSettings(function (settings) {
            console.log(`Closing tab ${tab.windowId}:${tab.id} ${tab.url}`);
            console.log(tab);
            var url = tab.url;
            var domain = new URL(url).hostname;

            var isSpecial = isSpecialTab(tab);
            var skip = false;
            if (settings.exempt_domains) {
                for (const exempt_domain of settings.exempt_domains) {
                    if (domain == exempt_domain) {
                        console.log(`Domain ${domain} is exempt`);
                        skip = true;
                    }
                }
            }
            if (settings.exempt_url_patterns) {
                for (const exempt_url_pattern of settings.exempt_url_patterns) {
                    if (exempt_domain.match(exempt_url_pattern)) {
                        console.log(`URL ${url} matches exempt ${exempt_url_pattern}`);
                        skip = true;
                    }
                }
            }
            if (tab.pinned) {
                console.log("Pinned tab, skipping");
                skip = true;
            }

            if (skip) {
                console.log("Rescheduling skipped tab");
                scheduleTab(tab, callback);
            } else {
                if (isSpecial) {
                    console.log("Special tab, not closing")
                } else if (DISABLE_CLOSE) {
                    console.log("Closing disabled")
                } else {
                    chrome.tabs.remove(tabId);
                }
                if (callback) {
                    callback();
                }
            }
        })
    });
}

function isSpecialTab(tab) {
    if (tab.pendingUrl) {
        var url = tab.pendingUrl;
    } else {
        var url = tab.url;
    }
    if (url == "chrome://newtab/") {
        return false;
    }
    if (url.startsWith("chrome")) {
        return true;
    }
    return false;
}

var ACTIVE = {};

function onActivated(activeInfo) {
    newTabId = activeInfo.tabId;
    prevTabId = ACTIVE[activeInfo.windowId];
    ACTIVE[activeInfo.windowId] = newTabId;
    if (prevTabId && prevTabId != newTabId) {
        console.log(`Changing active tab from ${prevTabId} to ${newTabId}`)
        getTab(prevTabId, function(prevTab) {
            if (!prevTab) {
                console.log("Previous tab was closed");
                getTab(newTabId, function(newTab) {
                    unscheduleTab(newTab);
                });
                return;
            }
            scheduleTab(prevTab, function() {
                getTab(newTabId, function(newTab) {
                    unscheduleTab(newTab);
                })
            })
        })
    } else {
        if (prevTabId) {
            console.log(`Active tab is ${newTabId}, same as previous`)
        } else {
            console.log(`Active tab is ${newTabId}`)
        }

        getTab(newTabId, function(newTab) {
            unscheduleTab(newTab);
        })
    }
}

chrome.runtime.onInstalled.addListener(function() {
    chrome.tabs.onCreated.addListener(function(tab) {
        console.log(`Tab created: ${tab.id}`);
        if (tab.id) {
            var now = Date.now();
            kv = {}
            kv[tab.id.toString()] = {
                "birth": now
            }
            chrome.storage.local.set(kv, function() {
                if (tab.id && !tab.active) {
                    scheduleTab(tab);
                }
            });
        }

    });

    chrome.tabs.onActivated.addListener(onActivated);

    //loop over existing tabs
    forEachTab(function(tab) {
        if (tab.active) {
            console.log(`Tab ${tab.windowId}:${tab.id} ${tab.url} is active, not scheduling`);
            return;
        }
        scheduleTab(tab);
    })

    console.log("Installed");
});

// debugging utility
function printAll() {
    forEachTab(function(tab) {
        processTabInfo(tab, function(tabInfo) {
            console.log(`Tab ${tab.windowId}:${tab.id} ${tab.url}`);
            console.log(tabInfo);
            console.log(`Death: ${new Date(tabInfo.death).toString()}`);
        });
    });
}

function getTab(tabId, callback) {
    chrome.tabs.get(tabId, callback);
}

// Iterate over each tab
function forEachTab(tabCallback) {
    chrome.windows.getAll(function(windows) {
        for (const window of windows) {
            // console.log(`Window ${window.id}`)
            // console.log(window);
            chrome.tabs.query({windowId: window.id}, function(tabs) {
                for (const tab of tabs) {
                    // console.log(`Tab ${tab.id} ${tab.url}`);
                    // console.log(tab);
                    tabCallback(tab);
                };
            });
        };
    });
}

// Get settings object from local storage
function getSettings(callback) {
    chrome.storage.local.get(["settings"], function(kv) {
        if (!kv.settings) {
            callback(null);
            return;
        }
        console.log(JSON.stringify(kv.settings))
        callback(kv.settings);
    });
}
