const {app, session} = require("electron");
const path = require("path");
const fs = require("fs");

// replacement for fs/promises readdir
function rdPromise(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, (e, f) => {
            if (e) return reject(e);
            resolve(f);
        });
    });
}

// count number of loaded extensions
let loaded = 0;
let errored = 0;

// LOAD NATIVE EXTENSIONS
// blocking calls are deliberate, this way we can handle early events (like the main window opening)
const extensionsDir = path.join(app.getPath("userData"), "nativeExtensions");

let files = [];

try {
    files = fs.readdirSync(extensionsDir);
} catch (e) {
    console.warn("[EL] couldn't read native extensions directory", e);
}

for (const file of files) {
    const ext = path.join(extensionsDir, file, "index.js");

    try {
        require(ext);
        console.log("[EL] Loaded native extension from " + ext);
        loaded++;
    } catch (e) {
        console.warn("[EL] Couldn't load native extension from " + ext, e);
        errored++;
    }
}

// LOAD WEBEXTENSIONS
// we can be a little less aggressive here
app.on("ready", async () => {
    const extensionsDir = path.join(app.getPath("userData"), "extensions");

    let files = [];
    try {
        files = await rdPromise(extensionsDir);
    } catch (e) {
        console.warn("[EL] couldn't read extensions directory", e);
    }

    for (const file of files) {
        const ext = path.join(extensionsDir, file);
        try {
            await session.defaultSession.loadExtension(ext, {allowFileAccess: true});
            console.log("[EL] Loaded extension from " + ext);
            loaded++;
        } catch (e) {
            console.warn("[EL] Couldn't load extension from " + ext, e);
            errored++;
        }
    }
});

function getTitle(t) {
    return `${t} - ${loaded} extension${loaded !== 1 ? "s" : ""} loaded${errored > 0 ? ", " + errored + " failed" : ""}`;
}

app.on("browser-window-created", (e, bw) => {
    bw.webContents.userAgent += " (zudo/extension-loader)";

    console.log(bw.webContents.getURL());

    bw.on("page-title-updated", (e, t) => {
        e.preventDefault();
        bw.title = getTitle(t);
    });
});
