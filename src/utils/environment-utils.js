"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shellEnvironmentVariables = void 0;
const child_process_1 = require("child_process");
/**
 * Cached environment variables for Git operations.
 */
exports.shellEnvironmentVariables = (() => {
    // Load all user environment variables from the current shell in interactive mode with triggering cd hook, to correctly simulate startup (for mise, asdf, dotenv, etc.)
    const userEnvironment = (0, child_process_1.execSync)(`/bin/zsh -l -i -c 'cd . &> /dev/null; /usr/bin/env -0'`)
        .toString()
        .trim()
        .split("\0")
        .map((value) => value.split("="))
        .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
    // Load SSH socket from launchctl to access the system ssh-agent with already set up SSH keys.
    const SSH_AUTH_SOCK_VALUE = (0, child_process_1.execSync)(`launchctl getenv SSH_AUTH_SOCK`).toString().trim();
    return {
        ...userEnvironment,
        SSH_AUTH_SOCK: SSH_AUTH_SOCK_VALUE
    };
})();
