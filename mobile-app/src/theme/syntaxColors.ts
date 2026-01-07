// Syntax Highlighting Colors Interface
export interface SyntaxColors {
	keyword: string;
	string: string;
	number: string;
	comment: string;
	function: string;
	type: string;
	operator: string;
	variable: string;
	decorator: string;
	tag: string;
	attribute: string;
	property: string;
	punctuation: string;
	default: string;
}

// Dark Mode Syntax Colors (One Dark Pro inspired)
export const darkSyntaxColors: SyntaxColors = {
	keyword: '#c678dd',      // Purple - const, let, function, if, etc.
	string: '#98c379',       // Green - "strings", 'strings', `templates`
	number: '#d19a66',       // Orange - 123, 3.14, 0xFF
	comment: '#5c6370',      // Gray - // comments, # comments
	function: '#61afef',     // Blue - functionName()
	type: '#e5c07b',         // Yellow - String, Number, MyClass
	operator: '#56b6c2',     // Cyan - +, -, =, ===, =>
	variable: '#e06c75',     // Red - variable names
	decorator: '#c678dd',    // Purple - @decorator
	tag: '#e06c75',          // Red - <div>, <Component>
	attribute: '#d19a66',    // Orange - className=, onClick=
	property: '#61afef',     // Blue - obj.property
	punctuation: '#abb2bf',  // Light gray - {}, [], (), ;
	default: '#abb2bf',      // Light gray - default text
};

// Light Mode Syntax Colors (VS Code Light+ inspired)
export const lightSyntaxColors: SyntaxColors = {
	keyword: '#7c3aed',      // Purple - const, let, function, if, etc.
	string: '#16a34a',       // Green - "strings", 'strings', `templates`
	number: '#c2410c',       // Orange - 123, 3.14, 0xFF
	comment: '#6b7280',      // Gray - // comments, # comments
	function: '#2563eb',     // Blue - functionName()
	type: '#b45309',         // Amber - String, Number, MyClass
	operator: '#0891b2',     // Cyan - +, -, =, ===, =>
	variable: '#dc2626',     // Red - variable names
	decorator: '#7c3aed',    // Purple - @decorator
	tag: '#dc2626',          // Red - <div>, <Component>
	attribute: '#c2410c',    // Orange - className=, onClick=
	property: '#2563eb',     // Blue - obj.property
	punctuation: '#374151',  // Dark gray - {}, [], (), ;
	default: '#374151',      // Dark gray - default text
};
