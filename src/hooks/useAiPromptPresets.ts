import { useCachedState } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useEffect, useMemo } from "react";

/**
 * Represents an AI commit message prompt preset.
 */
export interface AiPromptPreset {
    /** Unique identifier of the preset */
    id: string;
    /** Human-friendly preset name */
    name: string;
    /** Prompt template text to guide AI */
    prompt: string;
    /** AI model to use for the prompt */
    model?: string;
}

/**
 * Default prompt used when there are no saved presets.
 */
const DEFAULT_AI_COMMIT_PROMPT = `
You are a helpful assistant that generates concise, clear Git commit messages.

Analyze the provided git diff and generate a conventional commit message that accurately describes the changes.
- Focus on what changed and why.
- Use conventional commit format:
<short title>
<listed changes>
`;


/**
 * Hook for managing AI commit message prompt presets in cached state.
 * Presets are global for the extension (not per repository).
 */
export function useAiPromptPresets() {
    const defaultPreset = useMemo<AiPromptPreset>(() => ({
        id: "builtin",
        name: "Built-in Prompt",
        prompt: DEFAULT_AI_COMMIT_PROMPT,
        model: undefined
    }), []);

    const [presets, setPresets] = useCachedState<AiPromptPreset[]>("commit-message-prompts", []);

    useEffect(() => {
        // Ensure default preset is always up to date
        const defaultPresetIndex = presets.findIndex(p => p.id === "builtin");
        if (defaultPresetIndex !== -1) {
            const updatedPresets = [...presets];
            updatedPresets[defaultPresetIndex] = defaultPreset;
            setPresets(updatedPresets);
        } else {
            setPresets([defaultPreset]);
        }
    }, [presets]);

    const addPreset = (name: string, prompt: string, model?: string) => {
        const newPreset: AiPromptPreset = { id: nanoid(), name: name.trim(), prompt: prompt.trim(), model };
        setPresets((current) => [...current.filter((p) => p.name !== newPreset.name), newPreset]);
        return newPreset;
    };

    const updatePreset = (id: string, name: string, prompt: string, model?: string) => {
        setPresets((current) => current.map((p) => (p.id === id ? { ...p, name: name.trim(), prompt: prompt.trim(), model } : p)));
    };

    const deletePreset = (id: string) => {
        if (id === "builtin") {
            return;
        }

        setPresets((current) => current.filter((p) => p.id !== id));
    };

    const setDefault = (id: string) => {
        setPresets((current) => {
            const index = current.findIndex((p) => p.id === id);
            if (index === -1) return current;

            const newArray = [...current];
            const [item] = newArray.splice(index, 1);
            return [item, ...newArray];
        });
    };

    return {
        presets,
        addPreset,
        updatePreset,
        deletePreset,
        setDefault
    };
}
