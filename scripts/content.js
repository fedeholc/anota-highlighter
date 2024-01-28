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
  SAVE_LINK: "saveLink",
  SAVE_SESSION: "saveSession",
};

//*
//* Script logic
//*

if (!(typeof chrome !== "undefined" && chrome.runtime)) {
  console.error("chrome.runtime not found");
}

chrome.runtime.sendMessage(
  { command: COMMAND.GET_HL_STATE },
  function (response) {
    if (response.hlState === HL_STATE.ON) {
      createHLSatusButton();
    }
  }
);

//*
//* event listeners
//*

document.addEventListener("mouseup", handleMouseUp);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === COMMAND.SET_HL_STATE_ON) {
    createHLSatusButton();
  }

  if (request.command === COMMAND.SET_HL_STATE_OFF) {
    removeHLStatusButton();
  }
});

//*
//* functions
//*
function removeHLStatusButton() {
  let btnHLStatus = document.querySelector("#btnHLStatus");
  btnHLStatus?.remove();
}
function createHLSatusButton() {
  // checkea que no exista para no volver a crearlo
  if (!document.querySelector("#btnHLStatus")) {
    const btnHLStatus = document.createElement("div");
    // todo: pasar a css
    btnHLStatus.id = "btnHLStatus";
    const initialStyle =
      "position: fixed; top: 50px; right: 10px; width:  150px; height: 40px; border: 2px solid black; box-shadow: 0px 0px 5px 0px black; background-color: rgb(255, 212, 21); border-radius: 10px; display: flex;    justify-content: center; align-items: center; font-size: 16px; font-weight: bold; color: black; text-align: center; z-index: 9999999; transition: all 0.2s ease-out;";

    const hoverStyle =
      "position: fixed; top: 50px; right: 10px; width:  150px; height: 40px; border: 2px solid rgb(196, 0, 0); box-shadow: 0px 0px 5px 0px rgb(126, 0, 0); background-color: rgb(255, 255, 255); border-radius: 10px; display: flex;    justify-content: center; align-items: center; font-size: 16px; font-weight: bold; color: rgb(126, 0, 0);   text-align: center; outline: 1px solid rgb(196, 0, 0); cursor: pointer; transition: all 0.2s ease-out;";

    btnHLStatus.style.cssText = initialStyle;
    btnHLStatus.innerHTML = "Highlighter ON";

    document.querySelector("body")?.appendChild(btnHLStatus);

    btnHLStatus.addEventListener("click", function () {
      chrome.runtime.sendMessage({ command: COMMAND.SET_HL_STATE_OFF });
      removeHLStatusButton();
    });

    btnHLStatus.addEventListener("mouseenter", function () {
      btnHLStatus.style.cssText = hoverStyle;
      btnHLStatus.textContent = "STOP Highlighter";
      btnHLStatus.addEventListener("mouseout", function () {
        btnHLStatus.style.cssText = initialStyle;
        btnHLStatus.innerHTML = "Highlighter is ON";
      });
    });
  }
}

function handleMouseUp() {
  // checks if HL capture is ON, then process the text selection
  chrome.runtime.sendMessage(
    { command: COMMAND.GET_HL_STATE },
    function (response) {
      if (response.hlState === HL_STATE.ON) {
        processSelection(window.getSelection());
      }
    }
  );
}

/**
 * @param {Selection | null} selection
 */
function processSelection(selection) {
  const selectedText = selection?.toString().trim();

  if (selection && selectedText && selectedText !== "") {
    const range = selection.getRangeAt(0);
    const selectedNodes = getTextNodes(range);
    trimSelectionOffsets(selectedNodes, range);
    applyStyleToNodes(selectedNodes, "resaltado-amarillo");
    selection.removeAllRanges();

    /** @type {HLight} */
    let highlight = {
      text: selectedText,
      url: document.URL,
      doctitle: document.title,
      timestamp: new Date().getTime(),
    };

    chrome.runtime.sendMessage({
      command: COMMAND.ADD_HIGHLIGHT,
      highlight: highlight,
    });
  }
}

/**
 * @param {Text[]} nodes - Array de nodos de texto a los que se les quiere aplicar el estilo
 * @param {string} styleClass - Nombre de la clase de estilo a aplicar
 */
function applyStyleToNodes(nodes, styleClass) {
  // recorremos los nodos validos y los pintamos
  // lo hacemos con cada nodo por separado porque no se puede hacer
  // con un range que tenga varios nodos porque algunos de ellos no
  // van a ser nodos de texto y no se pueden pintar
  nodes.forEach((nodo) => {
    // creamos un elemento span con el estilo nuevo para aplicar a la selección
    var span = document.createElement("span");
    span.classList.add(styleClass); //todo: esto está funcionando?
    span.style.backgroundColor = "rgb(255, 212, 21)";
    span.style.color = "black";

    //Dos formas de resolver lo mismo (aplicar el span a la selección)
    // una es con surroundContents:
    let range = new Range();
    range.setStartBefore(nodo);
    range.setEndAfter(nodo);
    range.surroundContents(span);

    //y la otra es con replaceChild (ojo que los parametros de replace child son primero el nodo nuevo y luego el viejo)
    /*  span.appendChild(nodo.cloneNode(true));
        nodo.parentNode.replaceChild(span, nodo); */
  });
}

/**
 * @param {Text[]} validNodes
 * @param {Range} range
 */
function trimSelectionOffsets(validNodes, range) {
  // Como la selección puede empezar o terminar en medio de un nodo de texto
  // hay que dividir los nodos dejando solo la selección
  // si la selección total es de un solo nodo hacemos el split del inicio
  // y del final sobre validNodes[0]
  // si la selección es de más de un nodo hacemos el split del inicio sobre
  // validNodes[0] y el del final sobre validNodes[validNodes.length - 1]
  // splittext funciona mutando el nodo y devolviendo el nodo que queda
  // por eso para el primer nodo nos quedamos con lo que devuelve el split
  // y para el último nos quedamos con lo mutado
  validNodes[0] = validNodes[0].splitText(range.startOffset);
  if (validNodes.length === 1) {
    validNodes[0].splitText(range.endOffset);
  } else if (validNodes.length > 1) {
    validNodes[validNodes.length - 1].splitText(range.endOffset);
  }
}

/**
 * @param {Range} range
 * @returns {Text[]}
 */
function getTextNodes(range) {
  /** @type {Text[]} */
  let nodes = [];

  let inRangeObject = { inRange: false }; // hay que usar un objeto para pasar el inRange por referencia
  findTextNodes(
    inRangeObject,
    range.commonAncestorContainer,
    range.startContainer,
    range.endContainer,
    nodes
  );
  return nodes;
}

/**
 * @param {{inRange: boolean;}} inRangeObject
 * @param {Node} startContainer
 * @param {Node} endContainer
 * @param {Node[]} nodes
 * @param {Node} commonAncestor
 */
function findTextNodes(
  inRangeObject,
  commonAncestor,
  startContainer,
  endContainer,
  nodes
) {
  // si el rango es de un solo nodo no hay que seguir buscando
  if (startContainer === endContainer) {
    nodes.push(startContainer);
    return;
  }
  // recorro todos los nodos desde el ancestro común al rango
  // cuando encuentro el startContainer empiezo a guardar los nodos
  // hasta que encuentro el endContainer
  if (commonAncestor === startContainer) {
    inRangeObject.inRange = true;
  }
  commonAncestor.childNodes?.forEach((child) => {
    if (child === startContainer) {
      inRangeObject.inRange = true;
    }
    if (
      child.nodeType === Node.TEXT_NODE &&
      child.textContent &&
      child.textContent.trim().length > 0 &&
      inRangeObject.inRange
    ) {
      nodes.push(child);
    }
    if (child === endContainer) {
      inRangeObject.inRange = false;
    }
    findTextNodes(inRangeObject, child, startContainer, endContainer, nodes);
  });
}
