"use strict";

// - imports ------------------------------------------------------------------

const child_process = require("child_process");

const util = require("../lib/util.js");
const { info: log, error: log_error, stack: log_stack } = util.logger("postinstall");


// - main ---------------------------------------------------------------------

function main (argv) {
    log("verifying installation");

    const child = child_process.spawnSync("npx", [ "forge", "version" ]);
    if (child.error) {
        log_error(`error verifying installation ${child.error.message}`);
        log_stack(child.error.stack);
        process.exit(1);
    }
    if (child.status !== 0) {
        log_error(`error verifying installation, exited with code: ${child.status}`);
        log(`${child.stdout.toString()}`);
        log_error(`${child.stderr.toString()}`);
        process.exit(child.status);
    }
    log("successfully verified installation: ");
    log(child.stdout);
    log(child.stderr);

    log("fin");

    process.exit(0);
}


// - entry-point --------------------------------------------------------------

main(process.argv);
