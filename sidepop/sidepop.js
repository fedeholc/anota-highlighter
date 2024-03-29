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

/**
 * @typedef {Object} HLGroup
 * @property {string} url - The URL of the item.
 * @property {string} title - The title of the item.
 * @property {Number} time - The timestamp of the item.
 * @property {String[][]} highlights [text][toString(time)] - un Array de Arrays de Strings, donde cada Array de Strings tiene el texto del highlight y el timestamp del mismo.
 */

/**
 * @typedef {Map<string, HLGroup>} HLGroupMap
 */

//*
//* Script logic
//*

// Si el contexto es POPUP le pone un ancho máximo al body
chrome.runtime
  // @ts-ignore api nueva
  .getContexts({
    contextTypes: ["POPUP", "SIDE_PANEL"],
  })
  .then((contexts) => {
    if (contexts && contexts.length > 0) {
      if (contexts[0].contextType === "POPUP") {
        // @ts-ignore
        document.querySelector("body").style.maxWidth = "345px";
      }
    }
  });

displayAppState();
displayHighlights();

const hlStatusContainer = document.querySelector("#hl-status-container");
if (hlStatusContainer) {
  hlStatusContainer.innerHTML = `
    <div class="hl-status">
      <div id="hl-logged-in" class="hidden"></div>
      <div id="hl-logged-out" class="hidden"></div>
      <button id="btnLogout" class="hidden">Log Out</button>
      <button id="btnLogin" class="hidden">Log In</button>
    </div>
    <div class="hl-status">
      <div id="hl-status-on" class="hidden">Highlighter is ON</div>
      <div id="hl-status-off" class="hidden">Highlighter is OFF</div>
      <button id="hl-disable" class="hidden">Stop</button>
      <button id="hl-enable" class="hidden">Start</button>
    </div>
    <div class="hl-status">
      <button id="btnSaveLink">Save link</button>
      <button id="btnSaveSession">Save session</button>
    </div>
    `;
}

const btnEnable = document.querySelector("#hl-enable");
btnEnable?.addEventListener("click", async () => {
  // mensaje al background
  chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_ON });
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (activeTab.id && isWebPage(activeTab)) {
    // mensaje al content script
    chrome.tabs.sendMessage(activeTab.id, {
      command: COMMAND.SET_HL_STATE_ON,
    });
  }
  displayAppState();
});

const btnDisable = document.querySelector("#hl-disable");
btnDisable?.addEventListener("click", async () => {
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
  chrome.runtime.sendMessage({ command: COMMAND.LOGOUT }, () => {
    displayAppState();
  });
});

const btnSaveLink = document.querySelector("#btnSaveLink");
btnSaveLink?.addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  /** @type {HLight} */
  let highlight = {
    text: tabs[0].title + "\n🔹<" + tabs[0].url + ">",
    url: getFormattedDateTime().split(" ")[0],
    doctitle: "Saved links",
    timestamp: new Date().getTime(),
  };
  chrome.runtime.sendMessage({
    command: COMMAND.ADD_HIGHLIGHT,
    highlight: highlight,
  });
  displayHighlights();
});

const btnSaveSession = document.querySelector("#btnSaveSession");
btnSaveSession?.addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const tabsURLs = tabs
    .map((tab) => {
      return tab.title + "\n🔹<" + tab.url + ">";
    })
    .join("\n\n");

  /** @type {HLight} */
  let highlight = {
    text: tabsURLs,
    url: getFormattedDateTime(),
    doctitle: "Saved session",
    timestamp: new Date().getTime(),
  };
  chrome.runtime.sendMessage({
    command: COMMAND.ADD_HIGHLIGHT,
    highlight: highlight,
  });
  displayHighlights();
});

chrome.commands.onCommand.addListener(function (command) {
  //todo: agregar a commands
  if (command === "toggle-hlstate") {
    displayAppState();
  }
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

/**
 * Funcion que muestra un mensaje flotante en la pantalla
 * @param {string} message
 * @returns {void}
 **/
function toastAlert(message) {
  document.querySelector("#toastAlert")?.remove();
  const toastAlert = document.createElement("div");
  toastAlert.id = "toastAlert";
  toastAlert.innerHTML = message;
  document.querySelector("body")?.appendChild(toastAlert);
}

function displayAppState() {
  chrome.runtime.sendMessage({ command: COMMAND.GET_HL_STATE }, (response) => {
    if (response.hlState === HL_STATE.ON) {
      btnEnable?.classList.add("hidden");
      btnDisable?.classList.remove("hidden");
      document.querySelector("#hl-status-off")?.classList.add("hidden");
      document.querySelector("#hl-status-on")?.classList.remove("hidden");
    } else if (response.hlState === HL_STATE.OFF) {
      btnEnable?.classList.remove("hidden");
      btnDisable?.classList.add("hidden");
      document.querySelector("#hl-status-off")?.classList.remove("hidden");
      document.querySelector("#hl-status-on")?.classList.add("hidden");
    }
  });

  chrome.runtime.sendMessage(
    { command: COMMAND.GET_LOGIN_INFO },
    (response) => {
      const hlLoggedIn = document.querySelector("#hl-logged-in");
      const hlLoggedOut = document.querySelector("#hl-logged-out");
      const btnLogin = document.querySelector("#btnLogin");
      const btnLogout = document.querySelector("#btnLogout");

      if (hlLoggedIn && hlLoggedOut && btnLogin && btnLogout) {
        if (response.loginInfo.state === LOGIN_STATE.IN) {
          hlLoggedIn.textContent = "User: " + response.loginInfo.email;
          hlLoggedIn.classList.remove("hidden");
          hlLoggedOut.classList.add("hidden");
          btnLogin.classList.add("hidden");
          //btnLogout.classList.remove("hidden");
          btnLogout.classList.add("hidden"); //por ahora deshabilitada la opción de log out
        } else {
          hlLoggedOut.textContent = "User is logged out";
          hlLoggedOut.classList.remove("hidden");
          hlLoggedIn.classList.add("hidden");
          btnLogin.classList.remove("hidden");
          btnLogout.classList.add("hidden");
        }
      }
    }
  );
}

async function getLoginInfo() {
  let response = await chrome.runtime.sendMessage({
    command: COMMAND.GET_LOGIN_INFO,
  });
  if (response.loginInfo.state === LOGIN_STATE.IN) {
    return response.loginInfo.email;
  } else {
    return "Invitado"; //TODO: ver que no quede hardcodeado
  }
}

async function getHighlights() {
  let response = await chrome.runtime.sendMessage({
    command: COMMAND.GET_HIGHLIGHTS,
  });
  return response.highlights;
}

async function displayHighlights() {
  /** @type {HLight[]} */
  let highlights = await getHighlights();

  /** @type {HLGroupMap} */
  let groupedHL = createHLMap(highlights);

  /** @type {Number} */
  let countGroupId = -1;

  // Cada vez que se realiza un nuevo highlight hay que agregarlo a la pantalla.
  //Una opción sería encontrar el lugar exacto dónde agregarlo, pero eso tiene dificultades porque si queremos que se muestre arriba de todo la última web en la que se hizo un HL, además de agregar nodos, hay que mover o borrar y poner otros, con lo cual por el momento lo que se hace es borrar todo lo anterior y volver a crearlo.
  // selecciona y borra nodos de la lista de highlights
  document
    .querySelectorAll(".hl-group")
    .forEach((element) => element.parentNode?.removeChild(element));
  document
    .querySelectorAll(".hl-title")
    .forEach((element) => element.parentNode?.removeChild(element));

  groupedHL.forEach((hlGroup) => {
    countGroupId++;

    // creamos el HTML con la vista de los highlights agrupados y la agregamos al nodo container
    /** @type {HTMLDivElement} */
    let hlGroupElement = createHLGroupElement(hlGroup, countGroupId);
    document.querySelector(".hl-container")?.appendChild(hlGroupElement);

    //* boton enviar
    document
      .querySelector(`#button-send-group${countGroupId}`)
      ?.addEventListener("click", async (e) => {
        let joinedText = hlGroup.highlights
          .map((text) => reemplazarSaltosDeLineaPorHTML(escapeHtml(text[0])))
          .join("<br>...<br>");
        joinedText +=
          "<BR>- - - - - - - - -<BR>" +
          escapeHtml(hlGroup.title) +
          "<br>" +
          hlGroup.url;

        let preTitle = "";
        let tags = "";
        if (hlGroup.url.startsWith("http")) {
          preTitle = "Highlights de ";
          tags = "Highlights";
        } else {
          tags = "Links";
        }

        let userId = await getLoginInfo();
        console.log("userId:", userId);

        const note = {
          id: getFormattedDateTime(),
          noteText: joinedText,
          noteHTML: joinedText,
          noteTitle: preTitle + escapeHtml(hlGroup.title),
          tags: tags,
          category: "",
          deleted: false,
          archived: false,
          reminder: "",
          rating: 0,
          created: getFormattedDateTime(),
          modified: getFormattedDateTime(),
          usuario: userId,
        };

        toastAlert("SENT!");
        const API_URL = "http://localhost:3025";
        /*         const API_URL = "https://anotaback-federicoholc.koyeb.app";
         */
        fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(note),
        })
          .then((res) => {
            console.log("ok:", res);
            return res;
          })
          .catch((error) => {
            console.error("fetch error", error);
          });
      });

    //* boton download
    document
      .querySelector(`#button-download-group${countGroupId}`)
      ?.addEventListener("click", (e) => {
        let joinedText = hlGroup.highlights
          .map((text) => text[0])
          .join("\n\n...\n\n");
        joinedText =
          hlGroup.title +
          "\n" +
          hlGroup.url +
          "\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - -\n\n" +
          joinedText +
          "\n\n- - - - - - - - - - - - - - - - - - - - - - - - - - -\n";

        const blob = new Blob([joinedText], { type: "text/plain" });
        const enlaceDescarga = document.createElement("a");
        enlaceDescarga.href = URL.createObjectURL(blob);
        enlaceDescarga.download = `Highlights - ${hlGroup.title}.txt`;
        document.body.appendChild(enlaceDescarga);
        enlaceDescarga.click();
        document.body.removeChild(enlaceDescarga);
      });

    //* boton delete
    document
      .querySelector(`#button-delete-group${countGroupId}`)
      ?.addEventListener("click", (e) => {
        chrome.runtime.sendMessage({
          command: COMMAND.DELETE_HIGHLIGHT_GROUP,
          url: hlGroup.url,
        });
        displayHighlights();
      });

    //* botones delete de cada item
    hlGroup.highlights.map((item) => {
      document
        .querySelector(`#item${item[1]}`)
        ?.addEventListener("click", (e) => {
          chrome.runtime.sendMessage({
            command: COMMAND.DELETE_HIGHLIGHT_ITEM,
            timestamp: item[1],
          });
          displayHighlights();
        });
    });
  });
}

function getFormattedDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const day = ("0" + now.getDate()).slice(-2);
  const hours = ("0" + now.getHours()).slice(-2);
  const minutes = ("0" + now.getMinutes()).slice(-2);
  const seconds = ("0" + now.getSeconds()).slice(-2);

  const currentDateTime =
    year +
    "-" +
    month +
    "-" +
    day +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  return currentDateTime;
}

/**
 * @param {HLGroup} hlGroup
 * @param {number} groupId
 * @returns {HTMLDivElement}
 */
function createHLGroupElement(hlGroup, groupId) {
  let hlGroupElement = document.createElement("div");
  hlGroupElement.classList.add("hl-group");

  // agregamos url y titulo al elemento hlList que los va a contener. Url y título aparece una sola vez por grupo de highlights
  hlGroupElement.innerHTML = `
              <div class="hl-title">${escapeHtml(hlGroup.title)}</div>
              <div class="hl-url">
                  <a href="${hlGroup.url}">${hlGroup.url}</a>
              </div>
              <div class="hlg-toolbar">
                  <button id="button-delete-group${groupId}">Delete</button>
                  <button id="button-send-group${groupId}">Send</button>
                  <button id="button-download-group${groupId}">Download</button>
              </div>
              `;

  // recorremos el array de highlights y agregamos los que corresponden a la url grupo (filtrados)
  hlGroupElement.innerHTML += hlGroup.highlights
    // @ts-ignore creo que tira error porque toReversed es muy nuevo
    .toReversed()
    .map((item) => {
      return `
              <div class="hl-item">
                <div class="hl-toolbar">
                  <button id="item${item[1]}" class="hl-button">X</button>
                </div>
                <blockquote class="hl-text">
                ${reemplazarSaltosDeLineaPorHTML(escapeHtml(item[0]))}
                </blockquote>
              </div>
          `;
    })
    .join("");

  return hlGroupElement;
}

/**
 * @param {string} cadena
 */
function reemplazarSaltosDeLineaPorHTML(cadena) {
  const regex = /(\r\n|\n|\r)/g;
  const resultado = cadena.replace(regex, "<br>");
  return resultado;
}

/**
 * @param {HLight[]} highlights
 * @returns {HLGroupMap}
 */
function createHLMap(highlights) {
  // los HL se muestran agrupados por URL y título de la misma, y dentro de cada grupo se muestran los HL ordenados por fecha de creación, quedando arriba los más recientes.
  // Para hacer esto creamos un Map que va a tener los HL agrupados. Como al crear el map se "ordenan" segun como se van agregando y sobreescribiendo (si ya existe la Key en el map sobre escribe y queda la última info), hay que crearlo a partir del array de HL ordenado fecha creación para que en LastTime quede la última fecha en que se hizo un HL en esa url pero como de ese modo queda primero la primera url, hay que reordenar el map para que quede primero la última url en la que se hizo un HL.
  /** @type {HLGroupMap} */
  let resultMap = new Map();

  if (highlights && highlights.length > 0) {
    let tempHighlights = [...highlights];
    tempHighlights
      ?.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
      .map((item) => {
        resultMap.set(item.url, {
          url: item.url,
          title: item.doctitle,
          time: item.timestamp,
          highlights: [],
        });
      });

    let sortedArray = [...resultMap.entries()].sort((a, b) =>
      a[1].time > b[1].time ? -1 : 1
    );
    resultMap = new Map(sortedArray);

    tempHighlights.map((item) => {
      resultMap
        .get(item.url)
        ?.highlights.push([item.text, String(item.timestamp)]);
    });
  }
  return resultMap;
}

/**
 * La función escapeHtml es para evitar que se pueda inyectar código html en el DOM, y permite que si hay html en los highlights (o en el título de la página) se muestre como texto.
 * @param {string} unsafe
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

//*
//* event listeners
//*

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === COMMAND.ADD_HIGHLIGHT) {
    displayHighlights();
  }
  if (
    request.command === COMMAND.SET_HL_STATE_ON ||
    request.command === COMMAND.SET_HL_STATE_OFF
  ) {
    displayAppState();
  }
});
