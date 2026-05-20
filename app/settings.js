let extensionIsDisabled
let appearChance

function loadSettings() {
    chrome.storage.local.get({
        extensionIsDisabled: false,
        appearChance: 1.00,
    }, function (data) {
        document.getElementById('disableExtension').checked = !data.extensionIsDisabled;
        document.getElementById('appearChance').value = data.appearChance * 100;      
    });
}

function saveSettings() {
    const data = {
        extensionIsDisabled: !document.getElementById('disableExtension').checked,
        appearChance: parseInt(document.getElementById('appearChance').value) / 100,
        flipChance: parseInt(document.getElementById('flipChance').value) / 100
    };

    chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving settings:", chrome.runtime.lastError);
        } else {
            console.log("Settings saved successfully.");
        }
    });
}

function ChangeNameInHeading() {
    let extensionName = chrome.runtime.getManifest().name;

    extensionName = extensionName.replace(/youtube/i, '').trim();

    const titleElement = document.getElementById('extension-title');
    titleElement.textContent = titleElement.textContent.replace('TITLE', extensionName);
}

document.addEventListener('DOMContentLoaded', loadSettings);

document.getElementById('disableExtension').addEventListener('input', saveSettings);
document.getElementById('appearChance').addEventListener('input', saveSettings);
document.getElementById('flipChance').addEventListener('input', saveSettings);

document.addEventListener('DOMContentLoaded', ChangeNameInHeading);