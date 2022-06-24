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

let loaded = 0;
let errored = 0;

// load extensions
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

function getTitle() {
    return `TETR.IO Desktop - ${loaded} extension${loaded !== 1 ? "s" : ""} loaded${errored > 0 ? ", " + errored + " failed" : ""}`
}

app.on("browser-window-created", (e, bw) => {
    bw.title = getTitle();

    bw.on("page-title-updated", e => {
        e.preventDefault();
        bw.title = getTitle();
    });
})
