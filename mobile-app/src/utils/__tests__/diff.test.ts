import { generateDiff, formatDiffStats } from '../diff';

describe('Diff Utility', () => {
  describe('generateDiff', () => {
    it('should handle new file (null old content)', () => {
      const result = generateDiff(null, 'line1\nline2\nline3');
      
      expect(result.isNewFile).toBe(true);
      expect(result.additions).toBe(3);
      expect(result.deletions).toBe(0);
      expect(result.lines.every(l => l.type === 'add')).toBe(true);
    });

    it('should handle empty old content as new file', () => {
      const result = generateDiff('', 'new content');
      
      expect(result.isNewFile).toBe(true);
      expect(result.additions).toBe(1);
    });

    it('should detect additions', () => {
      const oldContent = 'line1\nline2';
      const newContent = 'line1\nline2\nline3';
      
      const result = generateDiff(oldContent, newContent);
      
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(0);
    });

    it('should detect deletions', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2';
      
      const result = generateDiff(oldContent, newContent);
      
      expect(result.deletions).toBe(1);
    });

    it('should detect modifications (add + remove)', () => {
      const oldContent = 'const x = 1;';
      const newContent = 'const x = 2;';
      
      const result = generateDiff(oldContent, newContent);
      
      // Modified line = 1 deletion + 1 addition
      expect(result.additions).toBe(1);
      expect(result.deletions).toBe(1);
    });

    it('should preserve context lines', () => {
      const oldContent = 'line1\nline2\nline3';
      const newContent = 'line1\nline2\nline3';
      
      const result = generateDiff(oldContent, newContent);
      
      expect(result.additions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.lines.every(l => l.type === 'context')).toBe(true);
    });

    it('should include line numbers', () => {
      const result = generateDiff('a\nb', 'a\nc');
      
      // Check that line numbers are present
      const hasLineNumbers = result.lines.some(l => 
        l.oldLineNum !== undefined || l.newLineNum !== undefined
      );
      expect(hasLineNumbers).toBe(true);
    });
  });

  describe('formatDiffStats', () => {
    it('should format new file', () => {
      const diff = { lines: [], additions: 5, deletions: 0, isNewFile: true };
      expect(formatDiffStats(diff)).toBe('New file');
    });

    it('should format additions only', () => {
      const diff = { lines: [], additions: 3, deletions: 0, isNewFile: false };
      expect(formatDiffStats(diff)).toBe('+3');
    });

    it('should format deletions only', () => {
      const diff = { lines: [], additions: 0, deletions: 2, isNewFile: false };
      expect(formatDiffStats(diff)).toBe('-2');
    });

    it('should format both additions and deletions', () => {
      const diff = { lines: [], additions: 5, deletions: 3, isNewFile: false };
      expect(formatDiffStats(diff)).toBe('+5, -3');
    });

    it('should handle no changes', () => {
      const diff = { lines: [], additions: 0, deletions: 0, isNewFile: false };
      expect(formatDiffStats(diff)).toBe('No changes');
    });
  });
});
