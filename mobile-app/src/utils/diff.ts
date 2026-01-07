/**
 * 📊 Diff Utility - Generate line-by-line diffs
 */

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  isNewFile: boolean;
}

/**
 * Generate a simple line-by-line diff
 * Uses a basic algorithm that compares lines sequentially
 */
export function generateDiff(oldContent: string | null, newContent: string): DiffResult {
  const isNewFile = oldContent === null || oldContent === '';
  
  if (isNewFile) {
    // All lines are additions
    const newLines = newContent.split('\n');
    return {
      lines: newLines.map((content, i) => ({
        type: 'add' as const,
        content,
        newLineNum: i + 1,
      })),
      additions: newLines.length,
      deletions: 0,
      isNewFile: true,
    };
  }

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // Use simple LCS-based diff
  const diffLines = computeDiff(oldLines, newLines);
  
  const additions = diffLines.filter(l => l.type === 'add').length;
  const deletions = diffLines.filter(l => l.type === 'remove').length;

  return {
    lines: diffLines,
    additions,
    deletions,
    isNewFile: false,
  };
}

/**
 * Compute diff using a simplified approach
 * Compares lines and marks differences
 */
function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  
  // Build a map of line occurrences in new content
  const newLineMap = new Map<string, number[]>();
  newLines.forEach((line, idx) => {
    if (!newLineMap.has(line)) {
      newLineMap.set(line, []);
    }
    newLineMap.get(line)!.push(idx);
  });

  // Track which new lines have been matched
  const matchedNew = new Set<number>();
  const matches: { oldIdx: number; newIdx: number }[] = [];

  // Find matching lines (greedy approach)
  oldLines.forEach((line, oldIdx) => {
    const candidates = newLineMap.get(line) || [];
    for (const newIdx of candidates) {
      if (!matchedNew.has(newIdx)) {
        matches.push({ oldIdx, newIdx });
        matchedNew.add(newIdx);
        break;
      }
    }
  });

  // Sort matches by position
  matches.sort((a, b) => a.newIdx - b.newIdx);

  // Build diff output
  let oldPtr = 0;
  let newPtr = 0;
  let matchIdx = 0;

  while (oldPtr < oldLines.length || newPtr < newLines.length) {
    const currentMatch = matches[matchIdx];

    if (currentMatch && oldPtr === currentMatch.oldIdx && newPtr === currentMatch.newIdx) {
      // Context line (matched)
      result.push({
        type: 'context',
        content: oldLines[oldPtr],
        oldLineNum: oldPtr + 1,
        newLineNum: newPtr + 1,
      });
      oldPtr++;
      newPtr++;
      matchIdx++;
    } else if (currentMatch && newPtr < currentMatch.newIdx) {
      // Addition (new line before next match)
      result.push({
        type: 'add',
        content: newLines[newPtr],
        newLineNum: newPtr + 1,
      });
      newPtr++;
    } else if (currentMatch && oldPtr < currentMatch.oldIdx) {
      // Deletion (old line before next match)
      result.push({
        type: 'remove',
        content: oldLines[oldPtr],
        oldLineNum: oldPtr + 1,
      });
      oldPtr++;
    } else if (!currentMatch && oldPtr < oldLines.length) {
      // No more matches, remaining old lines are deletions
      result.push({
        type: 'remove',
        content: oldLines[oldPtr],
        oldLineNum: oldPtr + 1,
      });
      oldPtr++;
    } else if (!currentMatch && newPtr < newLines.length) {
      // No more matches, remaining new lines are additions
      result.push({
        type: 'add',
        content: newLines[newPtr],
        newLineNum: newPtr + 1,
      });
      newPtr++;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Format diff stats for display
 */
export function formatDiffStats(diff: DiffResult): string {
  const parts: string[] = [];
  if (diff.additions > 0) parts.push(`+${diff.additions}`);
  if (diff.deletions > 0) parts.push(`-${diff.deletions}`);
  if (diff.isNewFile) return 'New file';
  return parts.join(', ') || 'No changes';
}
