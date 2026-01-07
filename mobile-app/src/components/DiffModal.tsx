import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { generateDiff, formatDiffStats, DiffLine } from '../utils/diff';

interface DiffModalProps {
  visible: boolean;
  filePath: string;
  oldContent: string | null;
  newContent: string;
  onApply: () => void;
  onCancel: () => void;
}

export function DiffModal({ visible, filePath, oldContent, newContent, onApply, onCancel }: DiffModalProps) {
  const { isDarkMode, colors } = useTheme();

  const diff = useMemo(() => {
    return generateDiff(oldContent, newContent);
  }, [oldContent, newContent]);

  const stats = formatDiffStats(diff);

  const renderLine = (line: DiffLine, index: number) => {
    let bgColor = 'transparent';
    let textColor = colors.text;
    let prefix = ' ';
    let lineNumColor = colors.textMuted;

    if (line.type === 'add') {
      bgColor = isDarkMode ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
      textColor = isDarkMode ? '#4ade80' : '#16a34a';
      prefix = '+';
      lineNumColor = textColor;
    } else if (line.type === 'remove') {
      bgColor = isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
      textColor = isDarkMode ? '#f87171' : '#dc2626';
      prefix = '-';
      lineNumColor = textColor;
    }

    return (
      <View key={index} style={[styles.diffLine, { backgroundColor: bgColor }]}>
        <View style={styles.lineNumbers}>
          <Text style={[styles.lineNum, { color: lineNumColor }]}>
            {line.oldLineNum || ''}
          </Text>
          <Text style={[styles.lineNum, { color: lineNumColor }]}>
            {line.newLineNum || ''}
          </Text>
        </View>
        <Text style={[styles.prefix, { color: textColor }]}>{prefix}</Text>
        <Text style={[styles.lineContent, { color: textColor }]} numberOfLines={1}>
          {line.content || ' '}
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <LinearGradient 
        colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} 
        style={styles.container}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.headerInfo}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={18} color={colors.primary} />
                <Text style={[styles.filePath, { color: colors.text }]} numberOfLines={1}>
                  {filePath}
                </Text>
              </View>
              <View style={styles.statsRow}>
                {diff.isNewFile ? (
                  <View style={[styles.statBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[styles.statText, { color: colors.success }]}>New file</Text>
                  </View>
                ) : (
                  <>
                    {diff.additions > 0 && (
                      <View style={[styles.statBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                        <Text style={[styles.statText, { color: '#22c55e' }]}>+{diff.additions}</Text>
                      </View>
                    )}
                    {diff.deletions > 0 && (
                      <View style={[styles.statBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                        <Text style={[styles.statText, { color: '#ef4444' }]}>-{diff.deletions}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Diff Content */}
          <ScrollView style={styles.diffContainer} horizontal>
            <ScrollView>
              <View style={[styles.diffContent, { backgroundColor: colors.background }]}>
                {/* Column Headers */}
                <View style={[styles.columnHeaders, { borderBottomColor: colors.border }]}>
                  <View style={styles.lineNumbers}>
                    <Text style={[styles.columnHeader, { color: colors.textMuted }]}>Old</Text>
                    <Text style={[styles.columnHeader, { color: colors.textMuted }]}>New</Text>
                  </View>
                  <Text style={[styles.prefix, { color: 'transparent' }]}> </Text>
                  <Text style={[styles.columnHeader, { color: colors.textMuted }]}>Content</Text>
                </View>
                
                {diff.lines.map((line, index) => renderLine(line, index))}
              </View>
            </ScrollView>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.actions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={onCancel}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onApply}>
              <LinearGradient colors={[colors.success, '#059669']} style={styles.applyBtn}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.applyBtnText}>Apply Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filePath: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  diffContainer: {
    flex: 1,
  },
  diffContent: {
    minWidth: '100%',
    paddingBottom: 20,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  diffLine: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 8,
    minHeight: 24,
    alignItems: 'center',
  },
  lineNumbers: {
    flexDirection: 'row',
    width: 70,
  },
  lineNum: {
    width: 35,
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'right',
    paddingRight: 8,
  },
  prefix: {
    width: 16,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  lineContent: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
