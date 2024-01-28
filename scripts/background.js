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

chrome.storage.local.get(["highlights"], (result) => {
  if (result.highlights && result.highlights.length > 0) {
    highlights = result.highlights;
  }
});

// create a function that returns a promise

//todo: no se puede desloguear
//todo: por ahora dejar así y luego ver si es posible trabajar un login en conexion con el backend. (proveer un ID??) un token via background? volver a ver los videos.
//todo: está pendiente el get login state y el loginInfo que definí
// todo: Cómo hacer un catch del error para que no se rompa?
// todo: dejar andando con google y  volver a probar con el otro método de login usando github

chrome.identity.clearAllCachedAuthTokens();

/* getLoginInfo().then((info) => {
  console.log("info desde bla", info);
}); */

// // Checkea si el usuario está logueado para mostrar esa info
// chrome.identity.getProfileUserInfo(
//   // @ts-ignore
//   { accountStatus: "ANY" },
//   (info) => {
//     loginStatus = info.email;
//     console.log("primera info:", info);
//   }
// );

//*
//* event listeners
//*

chrome.runtime.onInstalled.addListener(function () {
  console.log("Extension installed/updated");
  // reload all tabs on install/update para evitar Uncaught Error: Extension context invalidated.
  chrome.tabs.query({}, function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      chrome.tabs.reload(tabs[i]?.id ?? 0);
    }
  });
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  // `activeInfo` contiene información sobre la pestaña activa
  console.log("ainfo:", activeInfo);
  var activeTabId = activeInfo.tabId;
  console.log("Cambiaste a la pestaña con ID:", activeTabId);

  chrome.tabs.get(activeInfo.tabId, function (tab) {
    var tabUrl = tab.url || "";

    // Verificar si la URL comienza con "http://" o "https://"
    var isWebPage =
      tabUrl.startsWith("http://") || tabUrl.startsWith("https://");

    if (isWebPage) {
      console.log("La pestaña activa es una página web.");
      if (hlState === HL_STATE.ON) {
        chrome.tabs.sendMessage(activeTabId, {
          command: COMMAND.SET_HL_STATE_ON,
        });
      }
      if (hlState === HL_STATE.OFF) {
        chrome.tabs.sendMessage(activeTabId, {
          command: COMMAND.SET_HL_STATE_OFF,
        });
      }
    } else {
      console.log("La pestaña activa no es una página web.");
    }

    // Puedes realizar acciones adicionales aquí según sea necesario
    // ...
  });
});

chrome.commands.onCommand.addListener(async function (command) {
  if (command === "toggle-hlstate") {
    if (hlState === HL_STATE.ON) {
      hlState = HL_STATE.OFF;
      chrome.storage.local.set({ hlState: HL_STATE.OFF });

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      // Verificar si la URL de la pestaña es una web
      // para evitar: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
      const tabUrl = activeTab.url || "";
      const isWebPage =
        tabUrl.startsWith("http://") || tabUrl.startsWith("https://");
      if (activeTab.id && isWebPage) {
        chrome.tabs.sendMessage(activeTab.id, {
          command: COMMAND.SET_HL_STATE_OFF,
        });
      }
    } else {
      hlState = HL_STATE.ON;
      chrome.storage.local.set({ hlState: HL_STATE.ON });

      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Verificar si la URL de la pestaña es una web
      // para evitar: Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
      const tabUrl = activeTab.url || "";
      const isWebPage =
        tabUrl.startsWith("http://") || tabUrl.startsWith("https://");
      if (activeTab.id && isWebPage) {
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
    // ojo, si desde otro lado como side.js se manda mensaje con un callback a ejecutar, es necesario enviar un:
    //sendResponse(true);
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
      sendResponse({ hlState: result.hlState, loginStatus: loginStatus }); //TODO: puedo definir tipos para los parámetros de sendResponse?
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
          // Maneja el error
          let loginInfo = {
            state: LOGIN_STATE.OUT,
            email: null,
            id: null,
          };
          resolve(loginInfo);
          //console.log("Error x: ", token, chrome.runtime.lastError.message);
        }
      }
    );
  });
}

/* async function loginWithAuth() {
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
            console.log("info desde auth", info);
            return info;
          }
        );
      }
    }
  );
} */

// const clientId =
//   "807483221008-qja7peb30ci9952tg122sjiopd8lbl94.apps.googleusercontent.com";
// const extensionRedirectUri = chrome.identity.getRedirectURL();
// const nonce = Math.random().toString(36).substring(2, 15);
// const authUrl = new URL("https://accounts.google.com/o/oauth2/auth");
// // Define fields for OpenID
// authUrl.searchParams.set("client_id", clientId);
// authUrl.searchParams.set("response_type", "id_token");
// authUrl.searchParams.set("redirect_uri", extensionRedirectUri);
// authUrl.searchParams.set("scope", "openid profile email");
// authUrl.searchParams.set("nonce", nonce);
// authUrl.searchParams.set("prompt", "consent");
// chrome.identity.launchWebAuthFlow(
//   {
//     url: authUrl.href,
//     interactive: true,
//   },
//   (redirectUrl) => {
//     if (redirectUrl) {
//       // The ID token is in the URL hash
//       const urlHash = redirectUrl.split("#")[1];
//       const params = new URLSearchParams(urlHash);
//       const jwt = params.get("id_token");
//       // Parse the JSON Web Token
//       // @ts-ignore
//       const base64Url = jwt.split(".")[1];
//       const base64 = base64Url.replace("-", "+").replace("_", "/");
//       const token = JSON.parse(atob(base64));
//       console.log(token); //TODO: ver que acá también viene el ID (Sub)
//       loginStatus = token.email;
//     }
//   }
// );

// Otro método de login, más simple, pero solo funciona con cuentas de google
/* chrome.identity.getAuthToken(
      {
        interactive: true,
      },
      (token) => {
        if (token) {
          chrome.identity.getProfileUserInfo(
            // @ts-ignore
            { accountStatus: "ANY" },
            (info) => {
              console.log(info);
              loginStatus = info.email;
              sendResponse({ loginStatus: loginStatus });
            }
          );
        }
      }
    ); */
