"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManagerActions = FileManagerActions;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const fs_1 = require("fs");
/**
 * Basic actions for managing a file.
 */
function FileManagerActions({ filePath, onOpen }) {
    if (!(0, fs_1.existsSync)(filePath))
        return null;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Open, { title: "Open", target: filePath, icon: api_1.Icon.Document, shortcut: { modifiers: ["cmd"], key: "o" }, onOpen: onOpen }), (0, jsx_runtime_1.jsx)(api_1.Action.OpenWith, { path: filePath, shortcut: { modifiers: ["cmd", "opt"], key: "o" }, onOpen: onOpen }), (0, jsx_runtime_1.jsx)(api_1.Action.ToggleQuickLook, { shortcut: { modifiers: ["cmd"], key: "y" } }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy File Path", content: filePath, shortcut: { modifiers: ["cmd", "opt"], key: "," } })] }));
}
