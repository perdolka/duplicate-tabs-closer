"use strict";

const initialize = async () => {
  const requestGetDuplicateTabsPromise = requestGetDuplicateTabs();
  setPanelOptions();
  localizePopup(document.documentElement);
  const duplicateTabs = await requestGetDuplicateTabsPromise;
  setDuplicateTabsTable(duplicateTabs);
};

const loadPageEvents = () => {

  // Save checkbox settings
  $(".list-group input[type='checkbox'").on("change", function () {
    saveOption(this.id, this.checked);
    if (this.className === "checkbox-filter") refreshGlobalDuplicateTabsInfo();
  });

  // Save combobox settings
  $(".list-group select").on("change", function () {
    saveOption(this.id, this.value);
    if (this.id === "onDuplicateTabDetected") changeAutoCloseOptionState(this.value);
    else if (this.id === "scope") refreshGlobalDuplicateTabsInfo();
  });

  // Save badge color settings
  $(".list-group input[type='color']").on("change", function () {
    saveOption(this.id, this.value);
    refreshGlobalDuplicateTabsInfo();
  });

  // Active selected tab
  $("#duplicateTabsTable").on("click", ".td-tab-link", function () {
    const tabId = parseInt($(this).parent().attr("tabId"));
    const windowId = parseInt($(this).parent().attr("windowId"));
    activateSelectedTab(tabId, windowId);
  });

  // Close selected tab
  $("#duplicateTabsTable").on("click", ".td-close-button", function () {
    const tabId = parseInt($(this).parent().attr("tabId"));
    requestCloseDuplicateTab(tabId);
  });

  // Close all duplicate tabs
  $("#closeDuplicateTabsBtn").on("click", function () {
    if (!$(this).hasClass("disabled")) requestCloseDuplicateTabs();
  });

};

// Show/Hide the AutoClose option
const changeAutoCloseOptionState = (state) => {
  $("#onRemainingTabGroup").toggleClass("hidden", state !== "A");
};

const sendMessage = (action, data) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: action, data: data }, response => {
      if (chrome.runtime.lastError) console.error("sendMessage error:", chrome.runtime.lastError.message);
      resolve(response);
    });
  });
};

const refreshGlobalDuplicateTabsInfo = () => sendMessage("refreshGlobalDuplicateTabsInfo", { "windowId": chrome.windows.WINDOW_ID_CURRENT });

const requestCloseDuplicateTabs = () => sendMessage("closeDuplicateTabs", { "windowId": chrome.windows.WINDOW_ID_CURRENT });

const requestCloseDuplicateTab = (tabId) => sendMessage("closeDuplicateTab", { "tabId": tabId });

const activateSelectedTab = (tabId, windowId) => sendMessage("activateTab", { "tabId": tabId, "windowId": windowId });

const requestGetDuplicateTabs = async () => {
  const response = await sendMessage("getDuplicateTabs", { "windowId": chrome.windows.WINDOW_ID_CURRENT });
  return response.data;
};

const setDuplicateTabsTable = (duplicateTabs) => {

  if (duplicateTabs) {
    chrome.windows.getCurrent(null, focusedWindow => {
      $("#duplicateTabsTable").empty();
      $("#duplicateTabsTable").append("<tbody></tbody>");
      duplicateTabs.forEach(duplicateTab => {
        const containerStyle = duplicateTab.containerColor ? "style='text-decoration:underline; text-decoration-color: " + duplicateTab.containerColor + ";'" : "";
        const title = (duplicateTab.windowId === focusedWindow.id) ? duplicateTab.title : "<em>" + duplicateTab.title + "</em>";
        $("#duplicateTabsTable > tbody").append("<tr tabId='" + duplicateTab.id + "' group='" + duplicateTab.group + "' windowId='" + duplicateTab.windowId + "'><td class='td-tab-link' " + containerStyle + "> <img src='" + duplicateTab.icon + "'>" + title + "</td><td class='td-close-button'><button type='button' class='close'>&times;</button></td></tr>");
      });
      $("#closeDuplicateTabsBtn").toggleClass("disabled", false);
    });
  }
  else {
    $("#duplicateTabsTable").empty();
    $("#duplicateTabsTable").append("<tr><td width='100% margin-left='5px'><font color='#9FACBD'><em>" + chrome.i18n.getMessage("noDuplicateTabs") + ".</em></font></td></tr>");
    $("#closeDuplicateTabsBtn").toggleClass("disabled", true);
    $(".td-tab-link").css("max-width", "280px");
  }

};

const saveOption = (name, value) => sendMessage("setStoredOption", { "name": name, "value": value });

const setPanelOption = (option, value) => {
  if (option === "environment") {
    if (value === "chrome") $("#containerItem").toggleClass("hidden", true);
  }
  else {
    if (typeof (value) === "boolean") {
      $("#" + option).prop("checked", value);
    }
    else if (value.startsWith("#")) {
      $("#" + option).prop("value", value);
    }
    else {
      $("#" + option + " option[value='" + value + "']").prop("selected", true);
      if (option === "onDuplicateTabDetected") changeAutoCloseOptionState(value, false);
    }
  }
};

const setPanelOptions = async () => {
  const response = await sendMessage("getOptions");
  const options = response.data;
  for (const option in options) {
    setPanelOption(option, options[option].value);
  }
};

const handleMessage = (message) => {
  if (message.action === "setStoredOption") setPanelOption(message.data.name, message.data.value);
  else if (message.action === "updateDuplicateTabsTable") setDuplicateTabsTable(message.data.duplicateTabs);
};

chrome.runtime.onMessage.addListener(handleMessage);

const handleDOMContentLoaded = () => {
  initialize();
  loadPageEvents();
};

document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);

// Localize the popup
const localizePopup = (node) => {
  const attribute = "i18n-content";
  const elements = node.querySelectorAll("[" + attribute + "]");
  elements.forEach(element => {
    const value = element.getAttribute(attribute);
    element.textContent = chrome.i18n.getMessage(value);
  });
};