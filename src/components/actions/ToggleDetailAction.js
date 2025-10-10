"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToggleDetail = useToggleDetail;
exports.ToggleDetailAction = ToggleDetailAction;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const utils_1 = require("@raycast/utils");
function useToggleDetail(id, title, initialValue = false) {
    const [isShowingDetail, setIsShowingDetail] = (0, utils_1.useCachedState)(`toggle-detail:${id}`, initialValue);
    const toggleDetail = () => {
        setIsShowingDetail(!isShowingDetail);
    };
    return { title, isShowingDetail, toggleDetail };
}
function ToggleDetailAction({ controller, shortcut }) {
    return ((0, jsx_runtime_1.jsx)(api_1.Action, { title: controller.isShowingDetail ? `Hide ${controller.title}` : `Show ${controller.title}`, icon: api_1.Icon.AppWindowSidebarLeft, onAction: controller.toggleDetail, shortcut: shortcut || { modifiers: ["cmd", "shift"], key: "d" } }));
}
