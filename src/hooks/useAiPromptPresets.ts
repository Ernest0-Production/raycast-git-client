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
 * Represents the data structure for storing AI prompt presets.
 */
export interface AiPromptPresetsData {
    /** List of all presets */
    presets: AiPromptPreset[];
    /** ID of the default preset */
    defaultPresetId: string;
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
- Only give the commit message, do not include any other text and markdown formatting.
`;


/**
 * Hook for managing AI commit message prompt presets in cached state.
 * Presets are global for the extension (not per repository).
 */
export function useAiPromptPresets() {
    const builtInPreset = useMemo<AiPromptPreset>(() => ({
        id: "builtin",
        name: "Built-in Prompt",
        prompt: DEFAULT_AI_COMMIT_PROMPT,
        model: "Google_Gemini_2.5_Flash"
    }), []);

    const [data, setData] = useCachedState<AiPromptPresetsData>("ai-prompts", {
        presets: [builtInPreset],
        defaultPresetId: builtInPreset.id,
    });

    const defaultPreset = data.presets.find((p) => p.id === data.defaultPresetId) ?? builtInPreset;
    const otherPresets = data.presets.filter((p) => p.id !== data.defaultPresetId);

    const addPreset = (name: string, prompt: string, model?: string) => {
        const newPreset: AiPromptPreset = { id: nanoid(), name: name, prompt: prompt, model };
        setData((current) => {
            return {
                ...current,
                presets: [...current.presets, newPreset],
            };
        });
    };

    const updatePreset = (id: string, name: string, prompt: string, model?: string) => {
        setData((current) => {
            return {
                ...current,
                presets: current.presets.map((p) => (p.id === id ? { ...p, name: name.trim(), prompt: prompt.trim(), model } : p)),
            };
        });
    };

    const deletePreset = (id: string) => {
        setData((current) => {
            return {
                ...current,
                presets: current.presets.filter((p) => p.id !== id),
            };
        });
    };

    const setDefault = (id: string) => {
        setData((current) => {
            if (current.presets.some((p) => p.id === id)) {
                return { ...current, defaultPresetId: id };
            }
            return current;
        });
    };

    return {
        defaultPreset,
        otherPresets,
        addPreset,
        updatePreset,
        deletePreset,
        setDefault,
    };
}
