"use strict";

// - imports ------------------------------------------------------------------

const fs = require("fs");
const os = require("os");
const path = require("path");
const process = require("process");
const url = require("url");

const fs_extra = require("fs-extra");
const to = require("await-to-js").default;

const util = require("../lib/util.js");
const { info: log, error: log_error, stack: log_stack } = util.logger("preinstall");


// - configuration ------------------------------------------------------------

const api_host = "trigger.io";
const api_version_info = `https://${api_host}/ap/version_info`;


// - main ---------------------------------------------------------------------

async function main (argv) {
    const platform = process.platform.toLowerCase();
    log(`executing preinstall.js on ${os.platform()}_${os.arch()}_${os.release()} (${platform})`);

    if (!fs.existsSync("bin")) {
        fs.mkdirSync("bin");
    }
    fs.existsSync("bin/darwin-x64") && fs_extra.removeSync("bin/darwin-x64");
    fs.existsSync("bin/unknown-src") && fs_extra.removeSync("bin/unknown-src");
    fs.existsSync("bin/win32-x32") && fs_extra.removeSync("bin/win32-x32");
    fs.existsSync("bin/native") && fs_extra.removeSync("bin/native");

    log("fetching latest version information");
    let [error, response] = await to(
        util.request(api_version_info, {
            json: true
        })
    );
    if (error) {
        log_error(`failed fetching package information with: ${error}`);
        log_stack(error.stack);
        return 1;
    }

    let source = response.body.distribution.forge.unknown.src;
    if (platform.startsWith("darwin")) {
        source = response.body.distribution.forge.darwin.x64;
    } else if (platform.startsWith("linux")) {
        source = response.body.distribution.forge.linux.src;
    } else if (platform.startsWith("win32")) {
        source = response.body.distribution.forge.win32.x32;
    } else {
        source = response.body.distribution.forge.unknown.src;
    }
    const source_sha256 = `${source}.sha256`;

    const filename = path.basename(url.parse(source).pathname);
    const archive = path.join("bin", filename);

    log(`downloading distribution files from ${source} to ${archive}`);
    [error, response] = await to(util.download(source, archive, (current, total) => {
        log(`received ${current} / ${total} bytes`);
    }));
    if (error) {
        log_error(`failed while requesting ${archive} with: ${error}`);
        log_stack(error.stack);
        return 1;
    }
    log(`downloaded ${response} bytes`);

    log(`fetching distribution file checksum information from ${source_sha256}`);
    [error, response] = await to(util.request(source_sha256));
    if (error) {
        log_error(`failed fetching checksum information with: ${error}`);
        log_stack(error.stack);
        return 1;
    }
    const sha256 = response.body.split(" ")[0];
    log(`distribution file checksum: ${sha256}`);

    log(`verifying distribution file: ${archive}`);
    [error, response] = await to(util.verify(archive, sha256));
    if (error) {
        log_error(`failed verifying distribution files with: ${error}`);
        log_stack(error.stack);
        return 1;
    }
    if (response !== true) {
        log_error("Failed verifying distribution files. Downloaded file does not match checksum. Please contact support@trigger.io");
        return 1;
    }
    log("successfully verified that the distribution file's sha256 checksum matches download");

    log(`extracting ${archive} to bin/`);
    [error, response] = await to(util.untargz(archive, "bin/", name => {
        log(`extracting ${name}`);
    }));
    if (error) {
        log_error(`failed while extracting ${archive} with: ${error}`);
        log_stack(error.stack);
        return 1;
    }
    fs.unlinkSync(archive)
    log(`extracted ${response} entries`);

    if (platform.startsWith("darwin")) {
        fs.renameSync("bin/darwin-x64", "bin/native");
    } else if (platform.startsWith("linux")) {
        fs.renameSync("bin/unknown-src", "bin/native");
    } else if (platform.startsWith("win32")) {
        fs.renameSync("bin/win32-x32", "bin/native");
    } else {
        fs.renameSync("bin/unknown-src", "bin/native");
    }

    log("fin");

    return 0;
};


// - entry-point --------------------------------------------------------------

main(process.argv)
    .then(code => {
        process.exitCode = code;
    })
    .catch(error => {
        log_error(`Fatal error: ${error}`);
        log_stack(error.stack);
        process.exit(1);
    })
    .finally(() => {
    });
