import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { Preferences } from "../types";

/**
 * Cached environment variables for Git operations.
 * Lazily computed once per application lifecycle.
 */
let cachedEnvironmentVariables: Record<string, string> | null | undefined;

/**
 * Gets environment variables for Git operations based on user preferences.
 * Returns augmented PATH for Homebrew setup or null if no augmentation is needed.
 *
 * @returns Environment variables object or null
 */
export function getEnvironmentVariables(): Record<string, string> | null {
    if (cachedEnvironmentVariables !== undefined) {
        return cachedEnvironmentVariables;
    }

    const preferences = getPreferenceValues<Preferences>();

    if (preferences.environmentPath === "homebrew") {
        const currentPath = execSync("echo $PATH").toString().trim();
        const augmentedPath = `/opt/homebrew/bin:/opt/homebrew/sbin:${currentPath}`;

        cachedEnvironmentVariables = {
            PATH: augmentedPath
        };
    } else {
        cachedEnvironmentVariables = null;
    }

    return cachedEnvironmentVariables;
}
