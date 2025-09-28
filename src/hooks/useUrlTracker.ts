import { useCachedState } from "@raycast/utils";
import { UrlTrackerConfig } from "../types";
import { nanoid } from "nanoid";

/**
 * Hook to manage URL tracker configurations (global across the extension).
 */
export function useUrlTracker() {
    const [configs, setConfigs] = useCachedState<UrlTrackerConfig[]>("url-tracker-configs", []);

    const addConfig = (title: string, regex: string, urlPlaceholder: string) => {
        const newConfig: UrlTrackerConfig = {
            id: nanoid(),
            title: title.trim(),
            regex: regex.trim(),
            urlPlaceholder: urlPlaceholder.trim(),
        };
        setConfigs((current) => [newConfig, ...current]);
        return newConfig;
    };

    const updateConfig = (id: string, title: string, regex: string, urlPlaceholder: string) => {
        setConfigs((current) =>
            current.map((c) => (c.id === id ? { ...c, title: title.trim(), regex: regex.trim(), urlPlaceholder: urlPlaceholder.trim() } : c)),
        );
    };

    const deleteConfig = (configId: string) => {
        setConfigs((current) => current.filter((c) => c.id !== configId));
    };

    const validateConfig = (config: { title: string; regex: string; urlPlaceholder: string }) => {
        // Test regex validity
        new RegExp(config.regex);

        // Check if URL template contains @key placeholder
        if (!config.urlPlaceholder.includes("@key")) {
            throw new Error("URL template must contain @key placeholder");
        }
    }

    const findUrls = (text: string) => {
        const results: Array<{ title: string; url: string }> = [];

        for (const config of configs) {
            try {
                const regex = new RegExp(config.regex, "i");
                const match = text.match(regex);

                let extractedKey: string | null = null;

                if (match && match.length > 1) {
                    // Use first capture group
                    extractedKey = match[1];
                } else if (match && match.length === 1) {
                    // Use full match if no capture groups
                    extractedKey = match[0];
                }

                if (extractedKey) {
                    const url = config.urlPlaceholder.replace("@key", extractedKey);
                    results.push({ title: config.title, url });
                }
            } catch {
                // Skip invalid regex patterns
                console.error(`Invalid regex pattern in config "${config.title}"`);
            }
        }

        return results;
    }

    return {
        configs,
        addConfig,
        updateConfig,
        deleteConfig,
        validateConfig,
        findUrls,
    };
}

/**
 * Replaces URL patterns in text with markdown links using provided configurations.
 */
export function replaceUrlPatternsWithLinks(text: string, configs: UrlTrackerConfig[]): string {
    let result = text;

    for (const config of configs) {
        try {
            const regex = new RegExp(config.regex, "gi"); // Global flag to replace all matches

            result = result.replace(regex, (match, ...args) => {
                const string = args[args.length - 1];
                const offset = args[args.length - 2];
                const captureGroup = args.length > 3 ? args[1] : args[0];

                // Check if this match is already inside a markdown link
                const beforeMatch = string.substring(0, offset);
                const afterMatch = string.substring(offset + match.length);

                // Simple check for existing markdown link format [text](url)
                const isInsideLink =
                    beforeMatch.includes("[") &&
                    afterMatch.includes("](") &&
                    beforeMatch.lastIndexOf("[") > beforeMatch.lastIndexOf("]");

                if (isInsideLink) {
                    return match; // Don't replace if already inside a link
                }

                let extractedKey: string;

                if (captureGroup) {
                    // Use first capture group if available
                    extractedKey = captureGroup;
                } else {
                    // Use full match if no capture groups
                    extractedKey = match;
                }

                const url = config.urlPlaceholder.replace("@key", extractedKey);
                return `[${match}](${url})`;
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            // Skip invalid regex patterns
            console.error(`Invalid regex pattern in config "${config.title}. Reason: ${errorMessage}"`);
        }
    }

    return result;
}
