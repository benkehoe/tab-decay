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

/*
{
    "exempt_domains": [],
    "exempt_url_patterns": [],
    "sites": [
        {
            "domain": "",
            "halflife": "",
            "units": ""
        },
        {
            "url_pattern": "",
            "halflife": "",
            "units": ""
        }
    ]
}
*/

// Saves options to chrome.storage
function save_options() {
    document.getElementById("errors").innerText = "";
    var settingsString = document.getElementById("settings").value;
    if (settingsString) {
        try {
            var settings = JSON.parse(settingsString);
        } catch (e) {
            document.getElementById("errors").innerText = e.message;
        }
    }

    var halflife = document.getElementById('halflife').value;
    var units = document.getElementById('units').value;
    kv = {
        'settings': {
            'default': {
                'value': halflife,
                'units': units
            },
            'exempt_domains': settings.exempt_domains,
            'exempt_url_patterns': settings.exempt_url_patterns,
            'sites': settings.sites
        }
    }
    chrome.storage.local.set(kv, function () {
        console.log("Settings saved", kv)
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.local.get(['settings'], function (kv) {
        if (!kv || !kv.settings) {
            return;
        }
        var settings = kv.settings;
        console.log("settings", settings);
        if (settings.default) {
            document.getElementById('halflife').value = settings.default.value;
            document.getElementById('units').value = settings.default.units;
        }
        var settings_box = {};
        if (settings.exempt_domains) {
            settings_box.exempt_domains = settings.exempt_domains;
        }
        if (settings.exempt_url_patterns) {
            settings_box.exempt_url_patterns = settings.exempt_url_patterns;
        }
        if (settings.sites) {
            settings_box.sites = settings.sites;
        }
        document.getElementById("settings").value = JSON.stringify(settings_box, null, 2);
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
