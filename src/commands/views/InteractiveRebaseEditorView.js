"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InteractiveRebaseEditorView;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
/**
 * Interactive rebase editor view.
 * Displays commits from the selected commit to HEAD and allows setting actions and reordering.
 */
function InteractiveRebaseEditorView(context) {
    const { pop } = (0, api_1.useNavigation)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [commits, setCommits] = (0, react_1.useState)([]);
    const [plan, setPlan] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        (async () => {
            try {
                setIsLoading(true);
                const list = await context.gitManager.getCommitsSince(context.startFromCommit);
                setCommits(list);
                // Default plan: pick all
                const initialPlan = {};
                for (const c of list) {
                    initialPlan[c.hash] = { hash: c.hash, action: "pick" };
                }
                setPlan(initialPlan);
            }
            catch (error) {
                // Git error has been surfaced by GitManager
            }
            finally {
                setIsLoading(false);
            }
        })();
    }, [context.gitManager, context.startFromCommit]);
    const setAction = (hash, action, newMessage) => {
        setPlan((prev) => ({ ...prev, [hash]: { ...prev[hash], action, newMessage } }));
    };
    const moveCommit = (hash, direction) => {
        setCommits((prev) => {
            const index = prev.findIndex((c) => c.hash === hash);
            if (index === -1)
                return prev;
            const newIndex = direction === "down" ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= prev.length)
                return prev;
            const cloned = prev.slice();
            const [item] = cloned.splice(index, 1);
            cloned.splice(newIndex, 0, item);
            return cloned;
        });
    };
    const performRebase = async () => {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Are you sure you want to rebase?",
            message: "This action cannot be undone.",
            primaryAction: {
                title: "Rebase",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (!confirmed)
            return;
        try {
            setIsLoading(true);
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Animated, title: "Rebasing..." });
            const planList = commits.map((c) => plan[c.hash]);
            await context.gitManager.interactiveRebase(context.startFromCommit, planList);
            await (0, api_1.showToast)({ style: api_1.Toast.Style.Success, title: "Rebase completed" });
            context.branches.revalidate();
            context.status.revalidate();
            pop();
        }
        catch (error) {
            pop();
            context.branches.revalidate();
            context.status.revalidate();
            context.navigateTo("status");
        }
        finally {
            setIsLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsx)(api_1.List, { isLoading: isLoading, navigationTitle: "Interactive Rebase", filtering: false, children: [...commits].reverse().map((commit) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: plan[commit.hash]?.newMessage ?? commit.message, accessories: [
                {
                    text: { value: commit.author },
                    tooltip: commit.authorEmail
                },
                {
                    text: { value: commit.date.toRelativeDateString() },
                    tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(commit.date)
                },
            ], icon: (() => {
                switch (plan[commit.hash]?.action) {
                    case "pick": return { value: { source: api_1.Icon.Dot, tintColor: api_1.Color.Green }, tooltip: "Pick: Use this commit" };
                    case "reword": return { value: { source: api_1.Icon.Message, tintColor: api_1.Color.Yellow }, tooltip: "Reword: Edit the commit message" };
                    case "edit": return { value: { source: api_1.Icon.Pencil, tintColor: api_1.Color.Yellow }, tooltip: "Edit: Stop for amending" };
                    case "drop": return { value: { source: api_1.Icon.Trash, tintColor: api_1.Color.Red }, tooltip: "Drop: Remove commit" };
                    case "squash": return { value: { source: api_1.Icon.ArrowDown, tintColor: api_1.Color.Blue }, tooltip: "Squash: Meld commit into previous one and keep message" };
                    case "fixup": return { value: { source: api_1.Icon.Download, tintColor: api_1.Color.Blue }, tooltip: "Fixup: Meld commit into previous one and discard message" };
                }
            })(), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Rebase", icon: api_1.Icon.Checkmark, onAction: performRebase }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Rebase Action", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Pick", icon: { source: api_1.Icon.Dot, tintColor: api_1.Color.Green }, onAction: () => setAction(commit.hash, "pick"), shortcut: { modifiers: ["cmd", "shift"], key: "p" } }), (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Reword", icon: { source: api_1.Icon.Message, tintColor: api_1.Color.Yellow }, target: (0, jsx_runtime_1.jsx)(RewordForm, { commit: commit, initialMessage: plan[commit.hash]?.newMessage ?? commit.message, onSubmit: (newMessage) => setAction(commit.hash, "reword", newMessage) }), shortcut: { modifiers: ["cmd"], key: "r" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Edit", icon: { source: api_1.Icon.Pencil, tintColor: api_1.Color.Yellow }, onAction: () => setAction(commit.hash, "edit"), shortcut: { modifiers: ["cmd"], key: "e" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Drop", icon: { source: api_1.Icon.Trash, tintColor: api_1.Color.Red }, style: api_1.Action.Style.Destructive, onAction: () => setAction(commit.hash, "drop"), shortcut: { modifiers: ["cmd"], key: "d" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Squash", icon: { source: api_1.Icon.ArrowDown, tintColor: api_1.Color.Blue }, onAction: () => setAction(commit.hash, "squash"), shortcut: { modifiers: ["cmd"], key: "s" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Fixup", icon: { source: api_1.Icon.Download, tintColor: api_1.Color.Blue }, onAction: () => setAction(commit.hash, "fixup"), shortcut: { modifiers: ["cmd"], key: "f" } })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Reorder", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move Up", icon: api_1.Icon.ChevronUp, onAction: () => moveCommit(commit.hash, "up"), shortcut: { modifiers: ["cmd", "opt"], key: "arrowUp" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Move Down", icon: api_1.Icon.ChevronDown, onAction: () => moveCommit(commit.hash, "down"), shortcut: { modifiers: ["cmd", "opt"], key: "arrowDown" } })] })] }) }, commit.hash))) }));
}
function RewordForm({ commit, initialMessage, onSubmit }) {
    const [message, setMessage] = (0, react_1.useState)(initialMessage);
    const { pop } = (0, api_1.useNavigation)();
    const handleSubmit = () => {
        onSubmit(message.trim());
        pop();
    };
    return ((0, jsx_runtime_1.jsx)(api_1.Form, { navigationTitle: `Reword ${commit.message}`, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Save Message", onSubmit: handleSubmit, icon: api_1.Icon.CheckCircle }) }), children: (0, jsx_runtime_1.jsx)(api_1.Form.TextArea, { id: "message", title: "Commit Message", value: message, onChange: setMessage, error: message.trim().length === 0 ? "Required" : undefined }) }));
}
