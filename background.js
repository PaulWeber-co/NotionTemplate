/**
 * Service Worker — Öffnet Anti Procrastinator beim Klick auf das Extension-Icon.
 */
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});

