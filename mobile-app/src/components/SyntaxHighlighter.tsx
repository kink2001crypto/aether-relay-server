import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSyntaxColors, useColors } from '../theme';
import { tokenizeLine, Token } from '../utils/tokenizer';

interface CodeLineProps {
  line: string;
  lineNumber: number;
  language: string;
  showLineNumbers?: boolean;
  fontSize?: number;
}

// Memoized code line component
export const CodeLine = React.memo(function CodeLine({
  line,
  lineNumber,
  language,
  showLineNumbers = true,
  fontSize = 13,
}: CodeLineProps) {
  const syntaxColors = useSyntaxColors();
  const colors = useColors();

  // Memoize tokenization
  const tokens = useMemo(
    () => tokenizeLine(line, language),
    [line, language]
  );

  return (
    <View style={styles.codeLine}>
      {showLineNumbers && (
        <Text style={[styles.lineNumber, { color: colors.textMuted, fontSize }]}>
          {lineNumber}
        </Text>
      )}
      <View style={styles.codeContent}>
        {tokens.map((token, i) => (
          <Text
            key={i}
            style={[
              styles.codeText,
              { color: syntaxColors[token.type] || syntaxColors.default, fontSize }
            ]}
          >
            {token.text}
          </Text>
        ))}
      </View>
    </View>
  );
});

interface SyntaxHighlighterProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  fontSize?: number;
  maxLines?: number;
  startLine?: number;
}

// Main syntax highlighter component
export function SyntaxHighlighter({
  code,
  language,
  showLineNumbers = true,
  fontSize = 13,
  maxLines,
  startLine = 1,
}: SyntaxHighlighterProps) {
  const lines = useMemo(() => {
    const allLines = code.split('\n');
    if (maxLines && maxLines < allLines.length) {
      return allLines.slice(0, maxLines);
    }
    return allLines;
  }, [code, maxLines]);

  return (
    <View style={styles.container}>
      {lines.map((line, index) => (
        <CodeLine
          key={index}
          line={line}
          lineNumber={startLine + index}
          language={language}
          showLineNumbers={showLineNumbers}
          fontSize={fontSize}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 22,
  },
});

export default SyntaxHighlighter;
