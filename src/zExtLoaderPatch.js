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

const warningJS = `
(() => {
    const warningHTML = "<p class='modal_warning'>YOU ARE USING A MODIFIED CLIENT! DO NOT REPORT BUGS, ISSUES, OR OTHER ERRORS TO OSK OR TETR.IO, OR YOU WILL BE LAUGHED AT.</p>";
    const warningHTMLf8 = "<h1 style='color: #ff0'>!!! MODIFIED CLIENT - DO NOT REPORT BUGS !!!</h1>";
    
    document.querySelector("#js_load_retry_button").insertAdjacentHTML("beforebegin", warningHTML);
    document.querySelector("#performancemeter_header").insertAdjacentHTML("beforebegin", warningHTMLf8);
    
    const dialogObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length === 0) continue;
            const dialog = mutation.addedNodes[0];
            if (dialog.querySelector("h1").innerText !== "CONNECTION ERROR") continue;
            
            dialog.querySelector(".oob_button_holder").insertAdjacentHTML("beforebegin", warningHTML);
        }  
    });
    
    dialogObserver.observe(document.querySelector("#dialogs"), {childList: true});
})();
`;

app.on("browser-window-created", (e, bw) => {
    bw.webContents.userAgent += " (zudo/extension-loader)";

    if (bw.title !== "TETR.IO") return;

    bw.on("page-title-updated", (e, t) => {
        e.preventDefault();
        bw.title = getTitle(t);
    });

    bw.webContents.on("dom-ready", () => {
        if (bw.webContents.getURL() === "https://tetr.io/") {
            bw.webContents.executeJavaScript(warningJS);
        }
    });
});
