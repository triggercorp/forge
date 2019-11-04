"use strict";

// - imports ------------------------------------------------------------------

var crypto = require("crypto");
const fs = require("fs");
const zlib = require("zlib");

const chalk = require("chalk");
const debug = require("debug");
const request_cb = require("request");
const node_stream_zip = require("node-stream-zip");
const tar = require("tar-fs");


// - exports ------------------------------------------------------------------

module.exports = {
    download,
    logger,
    request,
    truncate,
    untargz,
    unzip,
    verify
};


// - logging ------------------------------------------------------------------

function logger(namespace) {
    debug.enable(`${namespace}:*`);
    debug.formatArgs = function (args) {
        const prefix = `${this.namespace} `;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
    };

    const logger_info  = debug(`${namespace}:info`);
    const logger_error = debug(`${namespace}:error`);
    const logger_stack = debug(`${namespace}:stack`);

    logger_info.log = console.log.bind(console);
    logger_error.log = console.error.bind(console);
    logger_stack.log = console.error.bind(console);

    const log_info = (...args) => logger_info(chalk.blue(...args));
    const log_error = (...args) => logger_error(chalk.red.bold(...args));
    const log_stack = (...args) => logger_stack(chalk.red(...args));

    return {
        info:  log_info,
        error: log_error,
        stack: log_stack
    }
}


// - implementations ----------------------------------------------------------

function truncate (string, maxLength=50) {
    if (!string) {
        return null;
    }
    const dots = string.length > maxLength;
    return `${string.substring(0, maxLength)}${dots ? " ..." : ""}`;
};


function request (url, options) {
    return new Promise((resolve, reject) => {
        request_cb({
            ...options, ...{
                url: url,
                timeout: 10000,
            }
        }, (error, response, body) => {
            if (error) {
                return reject(new Error(error));
            } else if (response.statusCode !== 200) {
                return reject(new Error(`HTTP ${response.statusCode}`));
            }
            return resolve(response);
        });
    });
};


function download (url, destination, progress) {
    let received_bytes = 0;
    let content_length = "unknown";
    return new Promise((resolve, reject) => {
        request_cb({ url: url, timeout: 10000, })
            .on("error", error => {
                return reject(new Error(error));
            })
            .on("data", data => {
                received_bytes += data.length;
                progress && progress(received_bytes, content_length);
            })
            .on("response", response => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`HTTP ${response.statusCode}`));
                } else if ("content-length" in response.headers) {
                    content_length = response.headers["content-length"];
                }
            })
            .pipe(fs.createWriteStream(destination))
            .on("error", error => {
                return reject(new Error(error));
            })
            .on("close", () => {
                resolve(received_bytes);
            });
    });
};


function verify (path, sha256) {
    return new Promise((resolve, reject) => {
        const shasum = crypto.createHash("sha256");
        fs.ReadStream(path)
            .on("error", error => {
                return reject(new Error(error));
            })
            .on("data", data => { shasum.update(data); })
            .on("end", function() {
                const digest = shasum.digest("hex");
                resolve(sha256 === digest);
            });
    });
}


function unzip (source, destination, progress) {
    return new Promise((resolve, reject) => {
        const zip = new node_stream_zip({ file: source })
            .on("error", error => {
                return reject(new Error(error));
            })
            .on("entry", entry => {
                progress && progress(entry.name);
            })
            .on("ready", () => {
                if (!fs.existsSync(destination)) {
                    fs.mkdirSync(destination);
                }
                zip.extract(null, destination, (error, count) => {
                    if (error) {
                        return reject(new Error(error));
                    }
                    zip.close();
                    resolve(count);
                });
            });
    });
};


function untargz (source, destination, progress) {
    let count = 0;
    return new Promise((resolve, reject) => {
        fs.createReadStream(source)
            .pipe(zlib.createGunzip())
            .pipe(tar.extract(destination))
            .on("error", error => {
                reject(new Error(error));
            })
            .on("entry", (header, stream, cb) => {
                progress && progress(header.name);
                count += 1;
            })
            .on("finish", () => {
                resolve(count);
            });
    });
};
