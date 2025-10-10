"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIssueTracker = useIssueTracker;
exports.replaceUrlPatternsWithLinks = replaceUrlPatternsWithLinks;
const utils_1 = require("@raycast/utils");
const nanoid_1 = require("nanoid");
/**
 * Hook to manage URL tracker configurations (global across the extension).
 */
function useIssueTracker() {
    const [configs, setConfigs] = (0, utils_1.useCachedState)("url-tracker-configs", []);
    const addConfig = (title, regex, urlPlaceholder) => {
        const newConfig = {
            id: (0, nanoid_1.nanoid)(),
            title: title.trim(),
            regex: regex.trim(),
            urlPlaceholder: urlPlaceholder.trim(),
        };
        setConfigs((current) => [newConfig, ...current]);
        return newConfig;
    };
    const updateConfig = (id, title, regex, urlPlaceholder) => {
        setConfigs((current) => current.map((c) => (c.id === id ? { ...c, title: title.trim(), regex: regex.trim(), urlPlaceholder: urlPlaceholder.trim() } : c)));
    };
    const deleteConfig = (configId) => {
        setConfigs((current) => current.filter((c) => c.id !== configId));
    };
    const validateConfig = (config) => {
        // Test regex validity
        new RegExp(config.regex);
        // Check if URL template contains @key placeholder
        if (!config.urlPlaceholder.includes("@key")) {
            throw new Error("URL template must contain @key placeholder");
        }
    };
    const findUrls = (text) => {
        const results = [];
        for (const config of configs) {
            try {
                const regex = new RegExp(config.regex, "i");
                const match = text.match(regex);
                let extractedKey = null;
                if (match && match.length > 1) {
                    // Use first capture group
                    extractedKey = match[1];
                }
                else if (match && match.length === 1) {
                    // Use full match if no capture groups
                    extractedKey = match[0];
                }
                if (extractedKey) {
                    const url = config.urlPlaceholder.replace("@key", extractedKey);
                    results.push({ title: config.title, url });
                }
            }
            catch {
                // Skip invalid regex patterns
                console.error(`Invalid regex pattern in config "${config.title}"`);
            }
        }
        return results;
    };
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
function replaceUrlPatternsWithLinks(text, configs) {
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
                const isInsideLink = beforeMatch.includes("[") &&
                    afterMatch.includes("](") &&
                    beforeMatch.lastIndexOf("[") > beforeMatch.lastIndexOf("]");
                if (isInsideLink) {
                    return match; // Don't replace if already inside a link
                }
                let extractedKey;
                if (captureGroup) {
                    // Use first capture group if available
                    extractedKey = captureGroup;
                }
                else {
                    // Use full match if no capture groups
                    extractedKey = match;
                }
                const url = config.urlPlaceholder.replace("@key", extractedKey);
                return `[${match}](${url})`;
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            // Skip invalid regex patterns
            console.error(`Invalid regex pattern in config "${config.title}. Reason: ${errorMessage}"`);
        }
    }
    return result;
}
