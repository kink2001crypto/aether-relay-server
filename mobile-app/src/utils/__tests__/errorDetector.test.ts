/**
 * Property-based tests for Error Detector
 * Feature: terminal-error-detection
 */

import * as fc from 'fast-check';
import { detectError, ErrorType } from '../errorDetector';

// Error keywords that should trigger detection
const ERROR_KEYWORDS = [
  'npm ERR!',
  'ENOENT',
  'EACCES',
  'error TS1234:',
  'fatal:',
  'CONFLICT',
  'ModuleNotFoundError',
  'SyntaxError',
  'command not found',
  'Permission denied',
  'No such file or directory',
];

// Success patterns that should NOT trigger detection
const SUCCESS_PATTERNS = [
  '0 errors',
  'no errors found',
  'Successfully compiled',
  'Done in 2.5s',
];

describe('Error Detector', () => {
  /**
   * Property 1: Error Detection Accuracy
   * For any terminal output containing error keywords, the detector SHALL identify it as an error.
   * Validates: Requirements 1.2, 4.1-4.5
   */
  describe('Property 1: Error Detection Accuracy', () => {
    it('should detect errors when output contains error keywords', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ERROR_KEYWORDS),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          (errorKeyword, prefix, suffix) => {
            const output = `${prefix}\n${errorKeyword}\n${suffix}`;
            const result = detectError(output);
            return result.isError === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect errors in success messages', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUCCESS_PATTERNS),
          (successPattern) => {
            const result = detectError(successPattern, 0);
            return result.isError === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Non-Zero Exit Code Detection
   * For any terminal command that returns a non-zero exit code, the detector SHALL flag it as an error.
   * Validates: Requirements 1.1
   */
  describe('Property 2: Non-Zero Exit Code Detection', () => {
    it('should detect errors when exit code is non-zero', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 255 }), // Non-zero exit codes
          fc.string({ minLength: 1, maxLength: 200 }),
          (exitCode, output) => {
            const result = detectError(output, exitCode);
            return result.isError === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT detect errors when exit code is zero and no error keywords', () => {
      const safeOutput = 'Build completed successfully\nAll tests passed';
      const result = detectError(safeOutput, 0);
      expect(result.isError).toBe(false);
    });
  });

  /**
   * Property 4: Error Type Classification
   * For any detected error matching a known pattern, the detector SHALL correctly classify the error type.
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
   */
  describe('Property 4: Error Type Classification', () => {
    const errorTypePatterns: { pattern: string; expectedType: ErrorType }[] = [
      { pattern: 'npm ERR! code ENOENT', expectedType: 'npm' },
      { pattern: 'npm ERR! 404 Not Found', expectedType: 'npm' },
      { pattern: 'EACCES: permission denied', expectedType: 'npm' },
      { pattern: 'error TS2304: Cannot find name', expectedType: 'typescript' },
      { pattern: 'src/file.tsx:10:5 - error', expectedType: 'typescript' },
      { pattern: 'fatal: not a git repository', expectedType: 'git' },
      { pattern: 'CONFLICT (content): Merge conflict', expectedType: 'git' },
      { pattern: 'ModuleNotFoundError: No module named', expectedType: 'python' },
      { pattern: 'Traceback (most recent call last):', expectedType: 'python' },
      { pattern: 'zsh: command not found: xyz', expectedType: 'shell' },
      { pattern: 'Permission denied (publickey)', expectedType: 'shell' },
    ];

    it('should correctly classify error types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...errorTypePatterns),
          ({ pattern, expectedType }) => {
            const result = detectError(pattern);
            return result.isError === true && result.errorType === expectedType;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Error Context Completeness
   * For any error, the rawOutput field SHALL contain the original output.
   * Validates: Requirements 2.3
   */
  describe('Property 3: Error Context Completeness', () => {
    it('should preserve raw output in error info', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ERROR_KEYWORDS),
          fc.string({ minLength: 0, maxLength: 50 }),
          (errorKeyword, extraContent) => {
            const output = `${extraContent}\n${errorKeyword}\nMore content`;
            const result = detectError(output);
            return result.rawOutput === output;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should work with array input', () => {
      const lines = ['$ npm install', 'npm ERR! code ENOENT', 'npm ERR! not found'];
      const result = detectError(lines);
      expect(result.isError).toBe(true);
      expect(result.rawOutput).toBe(lines.join('\n'));
    });
  });

  // Unit tests for specific edge cases
  describe('Edge Cases', () => {
    it('should extract file path from TypeScript error', () => {
      const output = 'src/components/Button.tsx:25:10 - error TS2304: Cannot find name';
      const result = detectError(output);
      expect(result.filePath).toBe('src/components/Button.tsx');
      expect(result.lineNumber).toBe(25);
    });

    it('should extract file path from Python error', () => {
      const output = 'File "/app/main.py", line 42\n    SyntaxError: invalid syntax';
      const result = detectError(output);
      expect(result.filePath).toBe('/app/main.py');
      expect(result.lineNumber).toBe(42);
    });

    it('should handle empty output', () => {
      const result = detectError('');
      expect(result.isError).toBe(false);
    });

    it('should handle output with only whitespace', () => {
      const result = detectError('   \n\n   ');
      expect(result.isError).toBe(false);
    });
  });
});
