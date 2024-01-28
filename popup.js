//*
//* ENUMS / Constants
//*
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

//*
//* script starting point
//*

displayAppState();

//*
//* event listeners
//*

const btnActivar = document.querySelector("#btnActivar");
btnActivar?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_ON });
  displayAppState();
});

const btnDesactivar = document.querySelector("#btnDesactivar");
btnDesactivar?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_OFF });
  displayAppState();
});

// @ts-ignore
const btnLogin = document.querySelector("#btnLogin");
btnLogin?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: COMMAND.LOGIN }, () => {
    displayAppState();
  });
});

// @ts-ignore
const btnLogout = document.querySelector("#btnLogout");
btnLogout?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ command: COMMAND.LOGOUT }, (response) => {
    displayAppState();
  });
});

//*
//* functions
//*

function displayAppState() {
  chrome.runtime.sendMessage({ command: COMMAND.GET_HL_STATE }, (response) => {
    // @ts-ignore
    document.querySelector(
      "#hlState" // @ts-ignore
    ).innerText = `HL State: ${response.hlState}`;

    // @ts-ignore
    document.querySelector(
      "#loginStatus" // @ts-ignore
    ).innerText = `Logged: ${response.loginStatus}`;
  });
}
