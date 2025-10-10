"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTildePath = resolveTildePath;
const os_1 = require("os");
const path_1 = require("path");
/**
 * Resolves a tilde (~) path to an absolute path.
 * @param path - The path, which may start with ~.
 * @returns The absolute path.
 */
function resolveTildePath(path) {
    if (path.startsWith("~/")) {
        return (0, path_1.join)((0, os_1.homedir)(), path.slice(2));
    }
    if (path === "~") {
        return (0, os_1.homedir)();
    }
    return path;
}
