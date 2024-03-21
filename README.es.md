<!-- markdownlint-disable MD041 -->

[README in english](https://github.com/fedeholc/anota-highlighter/blob/main/README.en.md) [![en](https://img.shields.io/badge/lang-en-red.svg)](https://github.com/fedeholc/anota-highlighter/blob/main/README.md)

# Highlighter WebExtension para ANOTÁ

Highlighter es una extensión para el navegador google chrome que permite resaltar texto en cualquier sitio web y guardar esos resaltados, para luego descargarlos o enviarlos a [ANOTA](https://github.com/fedeholc/anota-front-react). También permite guardar links individuales o la sesión completa de todos los links abiertos en el navegador.

## Cómo instalar la extensión

1. Clonar el repositorio o descargar el archivo ZIP con el código ( Code > Download ZIP, desde la página principal del repositorio) y luego descomprimir el archivo ZIP descargado.
2. En Chrome, ir a chrome://extensions/.
3. Activar el "Modo desarrollador" (Developer Mode).
4. Hacer click en "Cargar descomprimida" (Load Unpacked").
5. Seleccionar la carpeta que tiene el código de la extensión.
6. Hacer click en el ícono de extensiones y luego en el ícono con el pin de la extensión para hacerla visible en la barra de herramientas.
7. Listo! La extensión está instalada y lista para usarse.

## Cómo usar la extensión

1. Hacer click en el ícono de la extensión para abrir el popup (o abrir la extensión en el Side Panel).
2. Hacer click en "Start".
3. Ya puedes resaltar texto en cualquier sitio web.
4. También puedes guardar uno o todos los links abiertos en el navegador (haciendo click en "Save link" o "Save session" respectivamente).
5. En el popup de la extensión o del Side Panel puedes ver los resaltados que has hecho (también los links guardados) y descargarlos en un archivo de texto haciendo click en "Download", o enviarlos a ANOTA haciendo click en "Send".

Para poder enviar los resaltados a ANOTA es necesario loguearse en la extensión con el mismo email que se utiliza en ANOTA.

## Recursos utilizados para su desarrollo

- [Documentación de referencia de Chrome extensions](https://developer.chrome.com/docs/extensions/reference/)
- El libro Building Browser Extensions de Matt Frisbie y su [repositorio de ejemplos](https://github.com/msfrisbie/demo-browser-extension)
- <https://onlinepngtools.com/create-transparent-png> para crear PNGs con fondos ransparentes
- <https://alexleybourne.github.io/chrome-extension-icon-generator/> para generar los íconos de la extensión

## Licencia

[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
Este proyecto está bajo la Licencia GPL v3 - vea el archivo [LICENSE.md](LICENSE.md) para más detalles.

### Autor

👤 **Federico Holc** [@fedeholc](https://github.com/fedeholc)
