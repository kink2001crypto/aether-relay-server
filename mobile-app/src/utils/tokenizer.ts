import { SyntaxColors } from '../theme/syntaxColors';

export type TokenType = keyof SyntaxColors;

export interface Token {
	text: string;
	type: TokenType;
}

// Keywords by language
const JS_KEYWORDS = new Set([
	'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
	'switch', 'case', 'break', 'continue', 'import', 'export', 'from', 'default',
	'async', 'await', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends',
	'constructor', 'this', 'super', 'static', 'get', 'set', 'typeof', 'instanceof',
	'in', 'of', 'true', 'false', 'null', 'undefined', 'void', 'yield', 'delete',
	'interface', 'type', 'enum', 'implements', 'private', 'public', 'protected',
	'readonly', 'abstract', 'as', 'is', 'keyof', 'never', 'unknown', 'any',
]);

const PY_KEYWORDS = new Set([
	'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from',
	'as', 'try', 'except', 'finally', 'raise', 'with', 'async', 'await', 'True',
	'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'pass', 'break',
	'continue', 'global', 'nonlocal', 'assert', 'yield', 'del', 'print',
]);

const HTML_KEYWORDS = new Set([
	'html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li',
	'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'select', 'option',
	'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav',
	'section', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

const CSS_KEYWORDS = new Set([
	'color', 'background', 'margin', 'padding', 'border', 'width', 'height',
	'display', 'flex', 'grid', 'position', 'top', 'left', 'right', 'bottom',
	'font', 'text', 'align', 'justify', 'overflow', 'z-index', 'opacity',
	'transform', 'transition', 'animation', 'box-shadow', 'border-radius',
]);

// Built-in types
const TYPES = new Set([
	'String', 'Number', 'Boolean', 'Object', 'Array', 'Function', 'Symbol',
	'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error',
	'Int', 'Float', 'Double', 'Long', 'Short', 'Byte', 'Char', 'Void',
	'List', 'Dict', 'Tuple', 'Optional', 'Union', 'Any', 'Callable',
	'Record', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Exclude',
	'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'InstanceType',
	'React', 'Component', 'FC', 'ReactNode', 'JSX', 'Element',
]);

// Operators
const OPERATORS = new Set([
	'+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', '~', '?', ':',
	'==', '!=', '===', '!==', '<=', '>=', '&&', '||', '??', '++', '--',
	'+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '=>', '...', '?.', '::',
]);

// Punctuation
const PUNCTUATION = new Set([
	'(', ')', '{', '}', '[', ']', ';', ',', '.', '@',
]);

/**
 * Tokenize a line of code for syntax highlighting
 */
export function tokenizeLine(line: string, language: string): Token[] {
	if (!line) return [{ text: ' ', type: 'default' }];

	const tokens: Token[] = [];
	const lang = language.toLowerCase();
	const keywords = getKeywordsForLanguage(lang);

	let i = 0;

	while (i < line.length) {
		const remaining = line.slice(i);
		let matched = false;

		// Check for comments first (highest priority)
		const commentMatch = matchComment(remaining, lang);
		if (commentMatch) {
			tokens.push({ text: commentMatch, type: 'comment' });
			i += commentMatch.length;
			matched = true;
			continue;
		}

		// Check for strings
		const stringMatch = matchString(remaining);
		if (stringMatch) {
			tokens.push({ text: stringMatch, type: 'string' });
			i += stringMatch.length;
			matched = true;
			continue;
		}

		// Check for decorators (Python @decorator)
		if (lang === 'python' && remaining[0] === '@') {
			const decoratorMatch = remaining.match(/^@\w+/);
			if (decoratorMatch) {
				tokens.push({ text: decoratorMatch[0], type: 'decorator' });
				i += decoratorMatch[0].length;
				matched = true;
				continue;
			}
		}

		// Check for HTML/JSX tags
		if ((lang === 'html' || lang === 'jsx' || lang === 'tsx') && remaining[0] === '<') {
			const tagMatch = remaining.match(/^<\/?[a-zA-Z][\w.-]*/);
			if (tagMatch) {
				tokens.push({ text: tagMatch[0], type: 'tag' });
				i += tagMatch[0].length;
				matched = true;
				continue;
			}
		}

		// Check for closing tag
		if (remaining.startsWith('/>') || remaining.startsWith('</')) {
			const closeMatch = remaining.match(/^(\/?>|<\/)/);
			if (closeMatch) {
				tokens.push({ text: closeMatch[0], type: 'tag' });
				i += closeMatch[0].length;
				matched = true;
				continue;
			}
		}

		// Check for numbers
		const numberMatch = remaining.match(/^(?:0x[\da-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)/);
		if (numberMatch) {
			tokens.push({ text: numberMatch[0], type: 'number' });
			i += numberMatch[0].length;
			matched = true;
			continue;
		}

		// Check for multi-character operators
		const opMatch = matchOperator(remaining);
		if (opMatch) {
			tokens.push({ text: opMatch, type: 'operator' });
			i += opMatch.length;
			matched = true;
			continue;
		}

		// Check for words (keywords, types, functions, variables)
		const wordMatch = remaining.match(/^[a-zA-Z_$][\w$]*/);
		if (wordMatch) {
			const word = wordMatch[0];
			const nextChar = line[i + word.length];

			// Determine token type
			let type: TokenType = 'default';

			if (keywords.has(word)) {
				type = 'keyword';
			} else if (TYPES.has(word)) {
				type = 'type';
			} else if (nextChar === '(') {
				type = 'function';
			} else if (i > 0 && line[i - 1] === '.') {
				type = 'property';
			} else if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
				// PascalCase = likely a type/class
				type = 'type';
			} else {
				type = 'variable';
			}

			tokens.push({ text: word, type });
			i += word.length;
			matched = true;
			continue;
		}

		// Check for punctuation
		if (PUNCTUATION.has(remaining[0])) {
			tokens.push({ text: remaining[0], type: 'punctuation' });
			i++;
			matched = true;
			continue;
		}

		// Check for single character operators
		if (OPERATORS.has(remaining[0])) {
			tokens.push({ text: remaining[0], type: 'operator' });
			i++;
			matched = true;
			continue;
		}

		// Default: add character as-is
		if (!matched) {
			// Collect whitespace together
			const wsMatch = remaining.match(/^\s+/);
			if (wsMatch) {
				tokens.push({ text: wsMatch[0], type: 'default' });
				i += wsMatch[0].length;
			} else {
				tokens.push({ text: remaining[0], type: 'default' });
				i++;
			}
		}
	}

	return tokens.length > 0 ? tokens : [{ text: line || ' ', type: 'default' }];
}

function getKeywordsForLanguage(lang: string): Set<string> {
	switch (lang) {
		case 'javascript':
		case 'js':
		case 'typescript':
		case 'ts':
		case 'tsx':
		case 'jsx':
			return JS_KEYWORDS;
		case 'python':
		case 'py':
			return PY_KEYWORDS;
		case 'html':
			return HTML_KEYWORDS;
		case 'css':
		case 'scss':
			return CSS_KEYWORDS;
		default:
			return JS_KEYWORDS; // Default to JS keywords
	}
}

function matchComment(str: string, lang: string): string | null {
	// Python comments
	if ((lang === 'python' || lang === 'py') && str[0] === '#') {
		return str; // Rest of line is comment
	}

	// Single line comments
	if (str.startsWith('//')) {
		return str; // Rest of line is comment
	}

	// Multi-line comment start (just match the opening for now)
	if (str.startsWith('/*')) {
		const endIndex = str.indexOf('*/');
		if (endIndex !== -1) {
			return str.slice(0, endIndex + 2);
		}
		return str; // Unclosed comment, take rest of line
	}

	// CSS/HTML comment
	if (str.startsWith('<!--')) {
		const endIndex = str.indexOf('-->');
		if (endIndex !== -1) {
			return str.slice(0, endIndex + 3);
		}
		return str;
	}

	return null;
}

function matchString(str: string): string | null {
	const quote = str[0];
	if (quote !== '"' && quote !== "'" && quote !== '`') {
		return null;
	}

	let i = 1;
	while (i < str.length) {
		if (str[i] === '\\' && i + 1 < str.length) {
			i += 2; // Skip escaped character
			continue;
		}
		if (str[i] === quote) {
			return str.slice(0, i + 1);
		}
		i++;
	}

	// Unclosed string, return what we have
	return str;
}

function matchOperator(str: string): string | null {
	// Check for 3-character operators first
	const three = str.slice(0, 3);
	if (three === '===' || three === '!==' || three === '...' || three === '>>>' || three === '<<=' || three === '>>=') {
		return three;
	}

	// Check for 2-character operators
	const two = str.slice(0, 2);
	if (OPERATORS.has(two) || two === '==' || two === '!=' || two === '<=' || two === '>=' ||
		two === '&&' || two === '||' || two === '??' || two === '++' || two === '--' ||
		two === '+=' || two === '-=' || two === '*=' || two === '/=' || two === '=>' ||
		two === '?.' || two === '::' || two === '<<' || two === '>>') {
		return two;
	}

	return null;
}

/**
 * Get the language from a filename
 */
export function getLanguageFromFilename(filename: string): string {
	const ext = filename?.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'ts': return 'typescript';
		case 'tsx': return 'tsx';
		case 'js': return 'javascript';
		case 'jsx': return 'jsx';
		case 'py': return 'python';
		case 'json': return 'json';
		case 'html': return 'html';
		case 'css': return 'css';
		case 'scss': return 'scss';
		case 'md': return 'markdown';
		case 'sh': case 'bash': return 'bash';
		case 'yml': case 'yaml': return 'yaml';
		default: return 'text';
	}
}
