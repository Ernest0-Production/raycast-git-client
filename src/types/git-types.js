"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchScope = exports.MergeMode = void 0;
/**
 * Represents the mode of a merge.
 */
var MergeMode;
(function (MergeMode) {
    MergeMode["FAST_FORWARD"] = "ff";
    MergeMode["NO_FF"] = "no-ff";
    MergeMode["SQUASH"] = "squash";
    MergeMode["NO_COMMIT"] = "no-commit";
})(MergeMode || (exports.MergeMode = MergeMode = {}));
var PatchScope;
(function (PatchScope) {
    PatchScope["ALL"] = "all";
    PatchScope["STAGED"] = "staged";
    PatchScope["UNSTAGED"] = "unstaged";
})(PatchScope || (exports.PatchScope = PatchScope = {}));
