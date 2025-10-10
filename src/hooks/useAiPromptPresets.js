"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAiPromptPresets = useAiPromptPresets;
const utils_1 = require("@raycast/utils");
const nanoid_1 = require("nanoid");
const react_1 = require("react");
/**
 * Default prompt used when there are no saved presets.
 */
const DEFAULT_AI_COMMIT_PROMPT = `
You are a helpful assistant that generates concise, clear Git commit messages.

Analyze the provided git diff and generate a conventional commit message that accurately describes the changes.
Use conventional commit format:
\`\`\`example
<short title>
<listed changes>
\`\`\`
- Message should be without quotes.
- Focus on what changed and why.
`;
/**
 * Hook for managing AI commit message prompt presets in cached state.
 * Presets are global for the extension (not per repository).
 */
function useAiPromptPresets() {
    const defaultPreset = (0, react_1.useMemo)(() => ({
        id: "default",
        name: "Default Prompt",
        prompt: DEFAULT_AI_COMMIT_PROMPT,
        model: undefined
    }), []);
    const [presets, setPresets] = (0, utils_1.useCachedState)("ai-commit-message-presets", []);
    (0, react_1.useEffect)(() => {
        // Ensure default preset is always up to date
        const defaultPresetIndex = presets.findIndex(p => p.id === "default");
        if (defaultPresetIndex !== -1) {
            const updatedPresets = [...presets];
            updatedPresets[defaultPresetIndex] = defaultPreset;
            setPresets(updatedPresets);
        }
        else {
            setPresets([defaultPreset]);
        }
    }, [presets]);
    const addPreset = (name, prompt, model) => {
        const newPreset = { id: (0, nanoid_1.nanoid)(), name: name.trim(), prompt: prompt.trim(), model };
        setPresets((current) => [newPreset, ...current.filter((p) => p.name !== newPreset.name)]);
        return newPreset;
    };
    const updatePreset = (id, name, prompt, model) => {
        setPresets((current) => current.map((p) => (p.id === id ? { ...p, name: name.trim(), prompt: prompt.trim(), model } : p)));
    };
    const deletePreset = (id) => {
        if (id === "default") {
            return;
        }
        setPresets((current) => current.filter((p) => p.id !== id));
    };
    const movePreset = (id, direction) => {
        setPresets((current) => {
            const index = current.findIndex((p) => p.id === id);
            const newIndex = direction === "up" ? index - 1 : index + 1;
            const [item] = current.splice(index, 1);
            current.splice(newIndex, 0, item);
            return current;
        });
    };
    return {
        presets,
        addPreset,
        updatePreset,
        deletePreset,
        movePreset
    };
}
