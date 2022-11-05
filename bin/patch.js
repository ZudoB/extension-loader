const fs = require("fs/promises");
const path = require("path");
const asar = require("asar");

const OUT = "app-patched.asar";
const TEMP = "_temp";

const POTENTIAL_ASAR_PATHS = [
    "app.asar"
];

if (process.platform === "win32") {
    POTENTIAL_ASAR_PATHS.push(path.join(process.env.LOCALAPPDATA, "Programs", "tetrio-desktop", "resources", "app.asar"));
} else if (process.platform === "darwin") {
    POTENTIAL_ASAR_PATHS.push("/Applications/TETR.IO.app/Contents/Resources/app.asar");
}

const PATCH_JS = `

// load extension loader patch
require("./zExtLoaderPatch");
`;

/**
 * Checks if a path exists
 * @param p The path to check
 * @returns {Promise<boolean>} true if the path exists
 */
async function tryPath(p) {
    try {
        await fs.stat(p);
        return true;
    } catch {
        return false;
    }
}

/**
 * Clear the temp folder
 * @returns {Promise<void>}
 */
async function purgeTemp() {
    if (!await tryPath(TEMP)) return;
    await fs.rm(TEMP, {recursive: true, force: true});
}

/**
 * Patch files in the temp folder
 * @returns {Promise<void>}
 */
async function patch() {
    await fs.copyFile("zExtLoaderPatch.js", path.join(TEMP, "zExtLoaderPatch.js"));
    const mainPath = path.join(TEMP, "main.js");

    let mainSrc = await fs.readFile(mainPath, "utf8");
    if (mainSrc.indexOf("zExtLoaderPatch") === -1) { // don't append additional patch calls if we're updating
        mainSrc += PATCH_JS;
        await fs.writeFile(mainPath, mainSrc);
    }
}

/**
 * Test each potential asar path in turn until one is found, or not
 * @returns {Promise<string|undefined>} The path to app.asar if it was found, otherwise undefined
 */
async function getAsarPath() {
    for (const p of POTENTIAL_ASAR_PATHS) {
        if (await tryPath(p)) {
            return p;
        }
    }

    return undefined;
}

/**
 * Extract files from app.asar to the temp directory
 * @param p The path to app.asar
 * @returns {Promise<void>}
 */
async function extractAsar(p) {
    return asar.extractAll(p, TEMP);
}

/**
 * Create a patched app.asar from the contents of the temp directory.
 * @returns {Promise<void>}
 */
async function createAsar() {
    return asar.createPackage(TEMP, OUT);
}

(async function () {
    const asarPath = await getAsarPath();
    if (!asarPath) {
        return console.error("No app.asar found. Install TETR.IO Desktop, or copy app.asar to the working directory.");
    }
    console.log("Found app.asar at " + asarPath);

    console.log("Erasing temp folder");
    await purgeTemp();

    console.log("Extracting app.asar");
    await extractAsar(asarPath);

    console.log("Patching TETR.IO Desktop files");
    await patch();

    console.log("Building patched app.asar");
    await createAsar();

    console.log("Cleaning up");
    await purgeTemp();

    console.log("Done. Patched app.asar at " + OUT);
})();
