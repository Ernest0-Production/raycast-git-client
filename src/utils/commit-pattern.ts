import { AI, Cache, environment } from "@raycast/api";
import { GitManager } from "./git-manager";

/** Stable identifier of the built-in "Automatic" AI commit message preset. */
export const AUTOMATIC_PRESET_ID = "automatic-style";

/** Number of recent non-merge commits analyzed to infer the message style. */
const RECENT_COMMITS_TO_ANALYZE = 10;

/** Time-to-live for a cached commit style description, in milliseconds. */
const PATTERN_CACHE_TTL_MS = 5 * 60 * 1000;

/** Namespaced cache for storing resolved commit style descriptions per repository. */
const patternCache = new Cache({ namespace: "automatic-commit-pattern" });

/**
 * Cached commit style description together with its expiration timestamp.
 */
interface CachedPattern {
  /** AI-generated description of the repository commit message style. */
  pattern: string;
  /** Unix epoch (ms) after which the cached pattern is considered stale. */
  expiresAt: number;
}

/**
 * Instruction used to make the AI infer a reusable commit message style guide
 * from a list of recent commit messages.
 */
const PATTERN_DETECTION_PROMPT = `
You are analyzing the commit history of a Git repository to learn its commit message conventions.

Study the recent commit messages below and produce a concise style guide that another AI could follow to write a NEW commit message that fits seamlessly into this history.

Describe, when applicable:
- The title format (prefixes/types, scopes, casing, punctuation, gitmoji/emoji usage, approximate max length).
- The mood/voice (e.g. imperative vs past tense).
- Whether and how a body is used (bullet points, line wrapping, blank line after title).
- Any recurring patterns (issue/ticket references, trailers, etc.).

Output ONLY the style guide as plain instructions. Do not write an example commit message and do not add commentary.
`.trim();

/**
 * Fallback style guide used when the repository has no prior commit history to learn from.
 */
const FALLBACK_PATTERN = `
Write a clear, conventional commit message.

- Use a short imperative title under 50 characters ("add" not "added").
- Optionally add a body with bullet points describing notable changes, separated from the title by a blank line.
- Focus on WHAT changed.
`.trim();

/**
 * Builds the system prompt used to generate a commit message that matches the
 * repository's inferred commit style.
 * @param pattern - The resolved commit style description.
 */
export function buildAutomaticSystemPrompt(pattern: string): string {
  return [
    "You are a Git commit message generator.",
    "Analyze the provided git diff and write a commit message that strictly follows the repository's commit message style described below.",
    "",
    "--------------------",
    "REPOSITORY COMMIT STYLE:",
    "--------------------",
    pattern.trim(),
    "--------------------",
    "",
    "Output only the commit message, no markdown fences or extra text.",
  ].join("\n");
}

/**
 * Resolves a description of the commit message style used in the repository by
 * analyzing recent non-merge commits via AI. Results are cached per repository
 * with a short TTL to avoid repeated AI calls on consecutive generations.
 *
 * @param gitManager - Git manager bound to the target repository.
 * @param model - Optional AI model used for the analysis.
 * @returns A style guide describing the repository's commit message conventions.
 */
export async function resolveCommitMessagePattern(gitManager: GitManager, model?: AI.Model): Promise<string> {
  const cacheKey = gitManager.repoPath;

  const cachedRaw = patternCache.get(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedPattern;
      if (cached.expiresAt > Date.now() && cached.pattern.trim().length > 0) {
        return cached.pattern;
      }
    } catch {
      // Ignore malformed cache entries and recompute the pattern below.
    }
  }

  const messages = await gitManager.getRecentCommitMessages(RECENT_COMMITS_TO_ANALYZE);

  // Without prior history there is no style to learn from; use a sensible default.
  if (messages.length === 0) {
    return FALLBACK_PATTERN;
  }

  const prompt = [
    PATTERN_DETECTION_PROMPT,
    "",
    "--------------------",
    "RECENT COMMIT MESSAGES:",
    "--------------------",
    ...messages.map((message, index) => `Commit ${index + 1}:\n${message}\n`),
    "--------------------",
  ].join("\n");

  if (environment.isDevelopment) {
    console.warn("[Automatic Preset] Resolving commit style from recent messages...");
  }

  const pattern = (await AI.ask(prompt, { creativity: "none", model })).trim();

  const entry: CachedPattern = { pattern, expiresAt: Date.now() + PATTERN_CACHE_TTL_MS };
  patternCache.set(cacheKey, JSON.stringify(entry));

  return pattern;
}
