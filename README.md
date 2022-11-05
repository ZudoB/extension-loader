# Extension Loader for TETR.IO

A tool for loading Chrome/WebExtensions, or other arbitrary code ("native extensions") into TETR.IO Desktop. Pick up the
latest release, and replace the TETR.IO `app.asar`.

Add unpacked extensions to `%appdata%/tetrio-desktop/extensions`
. [Caveats apply](https://www.electronjs.org/docs/latest/api/extensions), don't expect everything to work.

Add native extensions to `%appdata%/tetrio-desktop/nativeExtensions`. A native extension consists of a directory
containing an `index.js` file, which will be required into the main process at launch.

## Disclaimers

If you want to use TETR.IO Plus, you won't be able to use this tool at the same time. Pick one or the other.

If you somehow install malware into your client, it's not my fault. This is primarily a tool for bot developers, or
other users who may find it useful to have a modified client. If you don't know what you're doing.

Released under the [MIT License](LICENSE.txt).
