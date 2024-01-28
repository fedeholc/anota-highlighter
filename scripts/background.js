//*
//* Enums, types, variables
//*
//? Types and Enums are repeated in background, side, popup and content scripts because there is no global scope. Same reason for the ts-ignore comments

/**
 * @typedef {Object} HLight
 * @property {string} text - The text of the highlight
 * @property {string} url - The URL where the highlight was made
 * @property {string} doctitle - The title of the html document
 * @property {Number} timestamp - The timestamp when the highlight was made
 */

/** @enum {string} */
// @ts-ignore
const HL_STATE = {
  ON: "on",
  OFF: "off",
};

/** @enum {string} */
// @ts-ignore
const LOGIN_STATE = {
  IN: "in",
  OUT: "out",
  ERROR: "error",
};

/**
 * @typedef {Object} LoginInfo
 * @property {LOGIN_STATE | null} state
 * @property {string | null} email
 * @property {string | null} id
 */

/** @enum {string} */
// @ts-ignore
const COMMAND = {
  ADD_HIGHLIGHT: "addHighlight",
  GET_HL_STATE: "getHlState",
  GET_HIGHLIGHTS: "getHighlights",
  SET_HL_STATE_ON: HL_STATE.ON,
  SET_HL_STATE_OFF: HL_STATE.OFF,
  DELETE_ALL_HIGHLIGHTS: "deleteAllHighlights",
  DELETE_HIGHLIGHT_GROUP: "deleteHighlightGroup",
  DELETE_HIGHLIGHT_ITEM: "deleteHighlightItem",
  LOGIN: "login",
  LOGOUT: "logout",
  GET_LOGIN_INFO: "getLoginState",
};

/** @type {HLight[]} */
let highlights = [];

/** @type {HL_STATE} */
let hlState = HL_STATE.OFF;

/** @type {string} */
let loginStatus = "loading...";

/** @type {LoginInfo} */
let loginInfo = { state: null, email: null, id: null };

//*
//* script logic
//*
// Setea el estado inicial de la captura de highlights en OFF
chrome.storage.local.set({ hlState: HL_STATE.OFF }).then(() => {
  hlState = HL_STATE.OFF;
});

// Busca los highlights guardados en el storage local
chrome.storage.local.get(["highlights"], (result) => {
  if (result.highlights && result.highlights.length > 0) {
    highlights = result.highlights;
  }
});

// esto hace que si el usuario se deslogueo en chrome, no quede logueado en la extensión
chrome.identity.clearAllCachedAuthTokens();

//*
//* event listeners
//*

chrome.runtime.onInstalled.addListener(function () {
  // reload all tabs on install/update para evitar Uncaught Error: Extension context invalidated.
  chrome.tabs.query({}, function (tabs) {
    for (let i = 0; i < tabs.length; i++) {
      chrome.tabs.reload(tabs[i]?.id ?? 0);
    }
  });
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    // Verificar si la URL de la pestaña es una web para evitar: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
    if (isWebPage(tab)) {
      if (hlState === HL_STATE.ON) {
        chrome.tabs.sendMessage(activeInfo.tabId, {
          command: COMMAND.SET_HL_STATE_ON,
        });
      }
      if (hlState === HL_STATE.OFF) {
        chrome.tabs.sendMessage(activeInfo.tabId, {
          command: COMMAND.SET_HL_STATE_OFF,
        });
      }
    }
  });
});

chrome.commands.onCommand.addListener(async function (command) {
  if (command === "toggle-hlstate") {
    if (hlState === HL_STATE.ON) {
      hlState = HL_STATE.OFF;
      chrome.storage.local.set({ hlState: HL_STATE.OFF });
      chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_OFF });

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab.id && isWebPage(activeTab)) {
        chrome.tabs.sendMessage(activeTab.id, {
          command: COMMAND.SET_HL_STATE_OFF,
        });
      }
    } else {
      hlState = HL_STATE.ON;
      chrome.storage.local.set({ hlState: HL_STATE.ON });
      chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_ON });

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (activeTab.id && isWebPage(activeTab)) {
        chrome.tabs.sendMessage(activeTab.id, {
          command: COMMAND.SET_HL_STATE_ON,
        });
      }
    }
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === COMMAND.ADD_HIGHLIGHT) {
    if (highlights && highlights.length > 0) {
      highlights.push(request.highlight);
    } else {
      highlights = [request.highlight];
    }
    chrome.storage.local.set({ highlights: highlights });
  }

  if (request.command === COMMAND.GET_HIGHLIGHTS) {
    if (highlights && highlights.length > 0) {
      sendResponse({ highlights: highlights });
    } else {
      chrome.storage.local.get(["highlights"], (result) => {
        highlights = result.highlights;
        sendResponse({ highlights: highlights });
      });
    }
  }

  if (request.command === COMMAND.SET_HL_STATE_ON) {
    console.log("recibido: SET_HL_STATE_ON");
    chrome.storage.local.set({ hlState: HL_STATE.ON }).then(() => {
      hlState = HL_STATE.ON;
    });
  }

  if (request.command === COMMAND.SET_HL_STATE_OFF) {
    chrome.storage.local.set({ hlState: HL_STATE.OFF }).then(() => {
      hlState = HL_STATE.OFF;
    });
  }

  if (request.command === COMMAND.DELETE_ALL_HIGHLIGHTS) {
    highlights = [];
    chrome.storage.local.set({ highlights: highlights });
    // ojo, si desde otro lado como side.js se manda mensaje con un callback a ejecutar, es necesario enviar un sendResponse(true); de lo contrario no se va a ejecutar el callback
  }
  if (request.command === COMMAND.DELETE_HIGHLIGHT_GROUP) {
    highlights = highlights.filter((item) => item.url !== request.url);
    chrome.storage.local.set({ highlights: highlights });
    // ojo, si desde otro lado como side.js se manda mensaje con un callback a ejecutar, es necesario enviar un:
    //sendResponse(true);
  }
  if (request.command === COMMAND.DELETE_HIGHLIGHT_ITEM) {
    highlights = highlights.filter(
      (item) => String(item.timestamp) !== request.timestamp
    );
    chrome.storage.local.set({ highlights: highlights });
    // ojo, si desde otro lado como side.js se manda mensaje con un callback a ejecutar, es necesario enviar un:
    //sendResponse(true);
  }

  if (request.command === COMMAND.LOGOUT) {
    chrome.identity.clearAllCachedAuthTokens().then(() => {
      getLoginInfo().then((info) => {
        sendResponse({ loginInfo: info });
      });
    });
  }

  if (request.command === COMMAND.LOGIN) {
    loginSimple().then((info) => {
      loginInfo = info;
      sendResponse({ loginInfo: loginInfo });
    });
  }

  if (request.command === COMMAND.GET_HL_STATE) {
    chrome.storage.local.get(["hlState"]).then((result) => {
      sendResponse({ hlState: result.hlState, loginStatus: loginStatus });
    });
  }
  if (request.command === COMMAND.GET_LOGIN_INFO) {
    getLoginInfo().then((info) => {
      sendResponse({ loginInfo: info });
    });
  }

  return true;
});

//*
//* functions
//*

/**
 * @param { chrome.tabs.Tab } tab
 * @returns {boolean}
 */
function isWebPage(tab) {
  let tabUrl = tab.url || "";
  return tabUrl.startsWith("http://") || tabUrl.startsWith("https://");
}

function loginSimple() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive: true,
      },
      (token) => {
        if (token) {
          chrome.identity.getProfileUserInfo(
            // @ts-ignore
            { accountStatus: "ANY" },
            (info) => {
              /** @type {LoginInfo} */
              let loginInfo = {
                state: LOGIN_STATE.IN,
                email: info.email,
                id: info.id,
              };
              resolve(loginInfo);
            }
          );
        }
        if (chrome.runtime.lastError) {
          /** @type {LoginInfo} */
          let loginInfo = {
            state: LOGIN_STATE.ERROR,
            email: null,
            id: null,
          };
          resolve(loginInfo);
        }
      }
    );
  });
}

function getLoginInfo() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive: false,
      },
      (token) => {
        if (token) {
          chrome.identity.getProfileUserInfo(
            // @ts-ignore
            { accountStatus: "ANY" },
            (info) => {
              let loginInfo = {
                state: LOGIN_STATE.IN,
                email: info.email,
                id: info.id,
              };
              resolve(loginInfo);
            }
          );
        }
        if (chrome.runtime.lastError) {
          let loginInfo = {
            state: LOGIN_STATE.OUT,
            email: null,
            id: null,
          };
          resolve(loginInfo);
        }
      }
    );
  });
}
