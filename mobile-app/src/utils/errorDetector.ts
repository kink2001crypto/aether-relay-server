/**
 * 🔍 Error Detector - Detects terminal errors and extracts info
 */

export type ErrorType = 'npm' | 'typescript' | 'git' | 'python' | 'shell' | 'unknown';

export interface ErrorInfo {
  isError: boolean;
  errorType: ErrorType;
  message: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  rawOutput: string;
  timestamp: Date;
}

interface ErrorPattern {
  pattern: RegExp;
  type: ErrorType;
  priority: number; // Higher = more specific
}

// Error patterns ordered by specificity
const ERROR_PATTERNS: ErrorPattern[] = [
  // NPM/Yarn errors (high priority)
  { pattern: /npm ERR!/i, type: 'npm', priority: 10 },
  { pattern: /npm WARN/i, type: 'npm', priority: 5 },
  { pattern: /ENOENT/i, type: 'npm', priority: 10 },
  { pattern: /EACCES/i, type: 'npm', priority: 10 },
  { pattern: /EPERM/i, type: 'npm', priority: 10 },
  { pattern: /Cannot find module/i, type: 'npm', priority: 9 },
  { pattern: /Module not found/i, type: 'npm', priority: 9 },
  { pattern: /peer dep/i, type: 'npm', priority: 7 },
  { pattern: /ERESOLVE/i, type: 'npm', priority: 10 },
  
  // TypeScript/Build errors
  { pattern: /error TS\d+:/i, type: 'typescript', priority: 10 },
  { pattern: /\.tsx?:\d+:\d+/i, type: 'typescript', priority: 8 },
  { pattern: /Type '.*' is not assignable/i, type: 'typescript', priority: 9 },
  { pattern: /Cannot find name/i, type: 'typescript', priority: 8 },
  { pattern: /Property '.*' does not exist/i, type: 'typescript', priority: 8 },
  { pattern: /ESLint/i, type: 'typescript', priority: 7 },
  
  // Git errors
  { pattern: /fatal:/i, type: 'git', priority: 10 },
  { pattern: /CONFLICT/i, type: 'git', priority: 10 },
  { pattern: /rejected.*push/i, type: 'git', priority: 9 },
  { pattern: /not a git repository/i, type: 'git', priority: 10 },
  { pattern: /merge conflict/i, type: 'git', priority: 10 },
  { pattern: /Your branch is behind/i, type: 'git', priority: 6 },
  
  // Python errors
  { pattern: /ModuleNotFoundError/i, type: 'python', priority: 10 },
  { pattern: /ImportError/i, type: 'python', priority: 10 },
  { pattern: /SyntaxError/i, type: 'python', priority: 10 },
  { pattern: /NameError/i, type: 'python', priority: 10 },
  { pattern: /TypeError/i, type: 'python', priority: 9 },
  { pattern: /Traceback \(most recent call last\)/i, type: 'python', priority: 10 },
  { pattern: /File ".*", line \d+/i, type: 'python', priority: 8 },
  
  // Shell errors (lower priority - catch-all)
  { pattern: /command not found/i, type: 'shell', priority: 10 },
  { pattern: /Permission denied/i, type: 'shell', priority: 9 },
  { pattern: /No such file or directory/i, type: 'shell', priority: 8 },
  { pattern: /Operation not permitted/i, type: 'shell', priority: 8 },
  { pattern: /zsh:|bash:/i, type: 'shell', priority: 7 },
];

// Patterns that indicate success (to avoid false positives)
const SUCCESS_PATTERNS = [
  /0 errors?/i,
  /no errors?/i,
  /successfully/i,
  /completed/i,
  /done/i,
  /✓|✔/,
];

/**
 * Extract file path and line number from error output
 */
function extractFileInfo(output: string): { filePath?: string; lineNumber?: number; columnNumber?: number } {
  // TypeScript style: src/file.ts(10,5) or src/file.ts:10:5
  const tsMatch = output.match(/([^\s]+\.tsx?)[:\(](\d+)[,:]?(\d+)?/i);
  if (tsMatch) {
    return {
      filePath: tsMatch[1],
      lineNumber: parseInt(tsMatch[2], 10),
      columnNumber: tsMatch[3] ? parseInt(tsMatch[3], 10) : undefined,
    };
  }

  // Python style: File "path/file.py", line 10
  const pyMatch = output.match(/File "([^"]+)", line (\d+)/i);
  if (pyMatch) {
    return {
      filePath: pyMatch[1],
      lineNumber: parseInt(pyMatch[2], 10),
    };
  }

  // Generic: path/file.ext:10 or path/file.ext:10:5
  const genericMatch = output.match(/([^\s:]+\.[a-z]+):(\d+)(?::(\d+))?/i);
  if (genericMatch) {
    return {
      filePath: genericMatch[1],
      lineNumber: parseInt(genericMatch[2], 10),
      columnNumber: genericMatch[3] ? parseInt(genericMatch[3], 10) : undefined,
    };
  }

  return {};
}

/**
 * Extract the most relevant error message from output
 */
function extractErrorMessage(output: string, errorType: ErrorType): string {
  const lines = output.split('\n').filter(l => l.trim());
  
  // Find the most relevant error line based on type
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (errorType === 'npm' && (lowerLine.includes('npm err!') || lowerLine.includes('enoent'))) {
      return line.replace(/npm ERR!/gi, '').trim();
    }
    if (errorType === 'typescript' && lowerLine.includes('error ts')) {
      return line;
    }
    if (errorType === 'git' && lowerLine.includes('fatal:')) {
      return line.replace(/fatal:/gi, '').trim();
    }
    if (errorType === 'python' && (lowerLine.includes('error') || lowerLine.includes('exception'))) {
      return line;
    }
    if (errorType === 'shell' && (lowerLine.includes('not found') || lowerLine.includes('denied'))) {
      return line;
    }
  }
  
  // Fallback: return first line with "error" or last non-empty line
  const errorLine = lines.find(l => l.toLowerCase().includes('error'));
  return errorLine || lines[lines.length - 1] || 'Unknown error';
}

/**
 * Check if output contains success indicators that override error detection
 */
function hasSuccessIndicator(output: string): boolean {
  return SUCCESS_PATTERNS.some(pattern => pattern.test(output));
}

/**
 * Detect errors in terminal output
 */
export function detectError(output: string | string[], exitCode?: number): ErrorInfo {
  const rawOutput = Array.isArray(output) ? output.join('\n') : output;
  const timestamp = new Date();
  
  // Default: no error
  const noError: ErrorInfo = {
    isError: false,
    errorType: 'unknown',
    message: '',
    rawOutput,
    timestamp,
  };
  
  // Check for success indicators first (avoid false positives)
  if (hasSuccessIndicator(rawOutput) && exitCode === 0) {
    return noError;
  }
  
  // Non-zero exit code is always an error
  if (exitCode !== undefined && exitCode !== 0) {
    // Still try to detect type from output
    const detected = detectErrorType(rawOutput);
    const fileInfo = extractFileInfo(rawOutput);
    
    return {
      isError: true,
      errorType: detected.type,
      message: extractErrorMessage(rawOutput, detected.type),
      ...fileInfo,
      rawOutput,
      timestamp,
    };
  }
  
  // Check patterns in output
  const detected = detectErrorType(rawOutput);
  if (detected.isError) {
    const fileInfo = extractFileInfo(rawOutput);
    
    return {
      isError: true,
      errorType: detected.type,
      message: extractErrorMessage(rawOutput, detected.type),
      ...fileInfo,
      rawOutput,
      timestamp,
    };
  }
  
  return noError;
}

/**
 * Detect error type from output text
 */
function detectErrorType(output: string): { isError: boolean; type: ErrorType } {
  let bestMatch: { type: ErrorType; priority: number } | null = null;
  
  for (const { pattern, type, priority } of ERROR_PATTERNS) {
    if (pattern.test(output)) {
      if (!bestMatch || priority > bestMatch.priority) {
        bestMatch = { type, priority };
      }
    }
  }
  
  if (bestMatch) {
    return { isError: true, type: bestMatch.type };
  }
  
  // Generic "error" or "failed" keywords (lowest priority)
  if (/\berror\b/i.test(output) || /\bfailed\b/i.test(output)) {
    // But not if it's a success message
    if (!hasSuccessIndicator(output)) {
      return { isError: true, type: 'unknown' };
    }
  }
  
  return { isError: false, type: 'unknown' };
}

/**
 * Get icon name for error type
 */
export function getErrorIcon(errorType: ErrorType): string {
  const icons: Record<ErrorType, string> = {
    npm: 'cube-outline',
    typescript: 'code-slash',
    git: 'git-branch',
    python: 'logo-python',
    shell: 'terminal',
    unknown: 'alert-circle',
  };
  return icons[errorType];
}

/**
 * Get color for error type
 */
export function getErrorColor(errorType: ErrorType): string {
  const colors: Record<ErrorType, string> = {
    npm: '#cb3837',      // npm red
    typescript: '#3178c6', // TypeScript blue
    git: '#f05032',      // Git orange
    python: '#3776ab',   // Python blue
    shell: '#4eaa25',    // Shell green
    unknown: '#dc2626',  // Red
  };
  return colors[errorType];
}

/**
 * Format error for AI context
 */
export function formatErrorForAI(error: ErrorInfo, projectName?: string): string {
  const parts = [
    `🚨 Terminal Error Detected`,
    ``,
    `**Error Type:** ${error.errorType.toUpperCase()}`,
    `**Message:** ${error.message}`,
  ];
  
  if (error.filePath) {
    parts.push(`**File:** ${error.filePath}${error.lineNumber ? `:${error.lineNumber}` : ''}`);
  }
  
  if (projectName) {
    parts.push(`**Project:** ${projectName}`);
  }
  
  parts.push(
    ``,
    `**Terminal Output:**`,
    '```terminal',
    error.rawOutput.split('\n').slice(-20).join('\n'), // Last 20 lines
    '```',
    ``,
    `Please analyze this error and suggest a fix. If a command is needed, provide it in a bash code block.`
  );
  
  return parts.join('\n');
}
