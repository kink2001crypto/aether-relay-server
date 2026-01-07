/**
 * 🔀 Git Panel - Shows git status and actions
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { GitStatus } from '../hooks/useApp';

interface GitPanelProps {
  gitStatus: GitStatus | null;
  onRefresh: () => void;
  onCommit: (message: string) => void;
  onPush: () => void;
}

export default function GitPanel({ gitStatus, onRefresh, onCommit, onPush }: GitPanelProps) {
  const { colors } = useTheme();
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  // Don't show if not a git repo
  if (!gitStatus || !gitStatus.isRepo) {
    return null;
  }

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      Alert.alert('⚠️ Message Required', 'Please enter a commit message');
      return;
    }
    onCommit(commitMessage.trim());
    setCommitMessage('');
    setShowCommitInput(false);
  };

  const handlePush = () => {
    if (gitStatus.ahead === 0) {
      Alert.alert('ℹ️ Nothing to Push', 'No unpushed commits');
      return;
    }
    Alert.alert(
      '🚀 Push Changes?',
      `Push ${gitStatus.ahead} commit(s) to remote?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Push', onPress: onPush }
      ]
    );
  };

  const totalChanges = (gitStatus.modified || 0) + (gitStatus.staged || 0) + (gitStatus.untracked || 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.branchInfo}>
          <Ionicons name="git-branch" size={18} color={colors.primary} />
          <Text style={[styles.branchName, { color: colors.text }]}>{gitStatus.branch || 'HEAD'}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="refresh" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Status Badges */}
      <View style={styles.statusRow}>
        {(gitStatus.modified || 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: '#f59e0b20' }]}>
            <Ionicons name="create-outline" size={14} color="#f59e0b" />
            <Text style={[styles.badgeText, { color: '#f59e0b' }]}>{gitStatus.modified} modified</Text>
          </View>
        )}
        {(gitStatus.staged || 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#22c55e" />
            <Text style={[styles.badgeText, { color: '#22c55e' }]}>{gitStatus.staged} staged</Text>
          </View>
        )}
        {(gitStatus.untracked || 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="add-circle-outline" size={14} color="#3b82f6" />
            <Text style={[styles.badgeText, { color: '#3b82f6' }]}>{gitStatus.untracked} new</Text>
          </View>
        )}
        {(gitStatus.ahead || 0) > 0 && (
          <View style={[styles.badge, { backgroundColor: '#8b5cf620' }]}>
            <Ionicons name="arrow-up" size={14} color="#8b5cf6" />
            <Text style={[styles.badgeText, { color: '#8b5cf6' }]}>{gitStatus.ahead} to push</Text>
          </View>
        )}
        {totalChanges === 0 && (gitStatus.ahead || 0) === 0 && (
          <View style={[styles.badge, { backgroundColor: '#22c55e20' }]}>
            <Ionicons name="checkmark" size={14} color="#22c55e" />
            <Text style={[styles.badgeText, { color: '#22c55e' }]}>Clean</Text>
          </View>
        )}
      </View>

      {/* Commit Input */}
      {showCommitInput && (
        <View style={styles.commitInputContainer}>
          <TextInput
            style={[styles.commitInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Commit message..."
            placeholderTextColor={colors.textMuted}
            value={commitMessage}
            onChangeText={setCommitMessage}
            autoFocus
            onSubmitEditing={handleCommit}
          />
          <View style={styles.commitActions}>
            <TouchableOpacity onPress={() => setShowCommitInput(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCommit}>
              <LinearGradient colors={[colors.success, '#059669']} style={styles.confirmBtn}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.confirmText}>Commit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {!showCommitInput && (
        <View style={styles.actions}>
          <TouchableOpacity 
            onPress={() => setShowCommitInput(true)} 
            disabled={totalChanges === 0}
            style={[styles.actionBtn, totalChanges === 0 && styles.actionBtnDisabled]}
          >
            <LinearGradient 
              colors={totalChanges > 0 ? [colors.primary, colors.primaryDark] : [colors.surfaceLight, colors.surface]} 
              style={styles.actionBtnGradient}
            >
              <Ionicons name="git-commit" size={16} color={totalChanges > 0 ? '#fff' : colors.textMuted} />
              <Text style={[styles.actionBtnText, { color: totalChanges > 0 ? '#fff' : colors.textMuted }]}>Commit</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handlePush}
            disabled={(gitStatus.ahead || 0) === 0}
            style={[styles.actionBtn, (gitStatus.ahead || 0) === 0 && styles.actionBtnDisabled]}
          >
            <LinearGradient 
              colors={(gitStatus.ahead || 0) > 0 ? ['#8b5cf6', '#7c3aed'] : [colors.surfaceLight, colors.surface]} 
              style={styles.actionBtnGradient}
            >
              <Ionicons name="cloud-upload" size={16} color={(gitStatus.ahead || 0) > 0 ? '#fff' : colors.textMuted} />
              <Text style={[styles.actionBtnText, { color: (gitStatus.ahead || 0) > 0 ? '#fff' : colors.textMuted }]}>Push</Text>
              {(gitStatus.ahead || 0) > 0 && (
                <View style={styles.pushBadge}>
                  <Text style={styles.pushBadgeText}>{gitStatus.ahead}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  branchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  branchName: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pushBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  pushBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  commitInputContainer: {
    marginBottom: 8,
  },
  commitInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  commitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
