import { readFileSync } from "fs";
import { ConflictSegment, FileConflicts } from "../types";
import { nanoid } from "nanoid";

/**
 * Parses a conflicted file and extracts all conflict segments.
 * 
 * Git conflict markers format:
 * <<<<<<< HEAD (or branch name)
 * current content
 * =======
 * incoming content
 * >>>>>>> branch-name (or commit hash)
 */
export function parseConflictedFile(filePath: string): FileConflicts {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");
  const segments: ConflictSegment[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1; // Line numbers are 1-based
      const currentLabel = line.replace(/^<{7}\s*/, "").trim() || "HEAD";

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const currentContent = lines.slice(i + 1, separatorIndex).join("\n");
        const incomingContent = lines.slice(separatorIndex + 1, endIndex).join("\n");
        const incomingLabel = lines[endIndex].replace(/^>{7}\s*/, "").trim() || "incoming";

        segments.push({
          id: nanoid(),
          startLine,
          endLine: endIndex + 1,
          currentContent,
          incomingContent,
          currentLabel,
          incomingLabel,
          resolution: null,
        });

        i = endIndex + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return {
    filePath,
    segments,
  };
}

/**
 * Applies conflict resolutions to a file and returns the resolved content.
 */
export function applyConflictResolutions(filePath: string, segments: ConflictSegment[]): string {
  const fileContent = readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  // Build a map of segment IDs to their resolution
  const resolutionMap = new Map<number, ConflictSegment>();
  for (const segment of segments) {
    if (segment.resolution) {
      resolutionMap.set(segment.startLine, segment);
    }
  }

  const resolvedLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for conflict start marker
    if (line.startsWith("<<<<<<<")) {
      const startLine = i + 1;

      // Find the separator
      let separatorIndex = i + 1;
      while (separatorIndex < lines.length && !lines[separatorIndex].startsWith("=======")) {
        separatorIndex++;
      }

      // Find the end marker
      let endIndex = separatorIndex + 1;
      while (endIndex < lines.length && !lines[endIndex].startsWith(">>>>>>>")) {
        endIndex++;
      }

      if (separatorIndex < lines.length && endIndex < lines.length) {
        const segment = resolutionMap.get(startLine);

        if (segment && segment.resolution) {
          // Apply the resolution
          const resolvedContent = segment.resolution === "current" 
            ? segment.currentContent 
            : segment.incomingContent;

          resolvedLines.push(resolvedContent);
        } else {
          // Keep the conflict markers if not resolved
          resolvedLines.push(...lines.slice(i, endIndex + 1));
        }

        i = endIndex + 1;
      } else {
        resolvedLines.push(line);
        i++;
      }
    } else {
      resolvedLines.push(line);
      i++;
    }
  }

  return resolvedLines.join("\n");
}
