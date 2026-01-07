"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeLine = void 0;
exports.SyntaxHighlighter = SyntaxHighlighter;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const theme_1 = require("../theme");
const tokenizer_1 = require("../utils/tokenizer");
// Memoized code line component
exports.CodeLine = react_1.default.memo(function CodeLine({ line, lineNumber, language, showLineNumbers = true, fontSize = 13, }) {
    const syntaxColors = (0, theme_1.useSyntaxColors)();
    const colors = (0, theme_1.useColors)();
    // Memoize tokenization
    const tokens = (0, react_1.useMemo)(() => (0, tokenizer_1.tokenizeLine)(line, language), [line, language]);
    return (<react_native_1.View style={styles.codeLine}>
      {showLineNumbers && (<react_native_1.Text style={[styles.lineNumber, { color: colors.textMuted, fontSize }]}>
          {lineNumber}
        </react_native_1.Text>)}
      <react_native_1.View style={styles.codeContent}>
        {tokens.map((token, i) => (<react_native_1.Text key={i} style={[
                styles.codeText,
                { color: syntaxColors[token.type] || syntaxColors.default, fontSize }
            ]}>
            {token.text}
          </react_native_1.Text>))}
      </react_native_1.View>
    </react_native_1.View>);
});
// Main syntax highlighter component
function SyntaxHighlighter({ code, language, showLineNumbers = true, fontSize = 13, maxLines, startLine = 1, }) {
    const lines = (0, react_1.useMemo)(() => {
        const allLines = code.split('\n');
        if (maxLines && maxLines < allLines.length) {
            return allLines.slice(0, maxLines);
        }
        return allLines;
    }, [code, maxLines]);
    return (<react_native_1.View style={styles.container}>
      {lines.map((line, index) => (<exports.CodeLine key={index} line={line} lineNumber={startLine + index} language={language} showLineNumbers={showLineNumbers} fontSize={fontSize}/>))}
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    codeLine: {
        flexDirection: 'row',
        minHeight: 22,
        alignItems: 'flex-start',
    },
    lineNumber: {
        width: 44,
        fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        textAlign: 'right',
        marginRight: 16,
        paddingTop: 2,
    },
    codeContent: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    codeText: {
        fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 22,
    },
});
exports.default = SyntaxHighlighter;
//# sourceMappingURL=SyntaxHighlighter.js.map