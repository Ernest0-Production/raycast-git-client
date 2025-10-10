"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitFileIcon = exports.FileStatusIcon = void 0;
const api_1 = require("@raycast/api");
/**
 * Icons for different types of changes
 */
const FileStatusIcon = (file) => {
    switch (file.type) {
        case "added":
            return { source: `plus-square.svg`, tintColor: api_1.Color.Green, tooltip: "Added" };
        case "modified":
            return { source: `square-pen.svg`, tintColor: api_1.Color.Yellow, tooltip: "Modified" };
        case "deleted":
            return { source: `square-minus.svg`, tintColor: api_1.Color.Red, tooltip: "Deleted" };
        case "renamed":
            return { source: `square-arrow-right-filled.svg`, tintColor: api_1.Color.Blue, tooltip: "Moved from " + file.oldPath };
        case "copied":
            return { source: `copy.svg`, tintColor: api_1.Color.Purple, tooltip: "Copied from " + file.oldPath };
        case "conflicted":
            return { source: `alert-square-filled.svg`, tintColor: api_1.Color.Red, tooltip: "Conflicted" };
        default:
            return { source: api_1.Icon.Document, tintColor: api_1.Color.SecondaryText, tooltip: "Unknown" };
    }
};
exports.FileStatusIcon = FileStatusIcon;
/**
 * Icons for commit file changes
 */
const CommitFileIcon = (change) => {
    switch (change.status) {
        case "added":
            return { source: `plus-square.svg`, tintColor: api_1.Color.Green, tooltip: "Added" };
        case "modified":
        case "changed":
            return { source: `square-pen.svg`, tintColor: api_1.Color.Yellow, tooltip: "Modified" };
        case "deleted":
            return { source: `square-minus.svg`, tintColor: api_1.Color.Red, tooltip: "Deleted" };
        case "renamed":
            return { source: `square-arrow-right-filled.svg`, tintColor: api_1.Color.Blue, tooltip: "Moved from " + change.oldPath };
        case "copied":
            return { source: `copy.svg`, tintColor: api_1.Color.Purple, tooltip: "Copied from " + change.oldPath };
        default:
            return { source: api_1.Icon.Document, tintColor: api_1.Color.SecondaryText, tooltip: "Unknown" };
    }
};
exports.CommitFileIcon = CommitFileIcon;
