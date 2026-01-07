import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export function SearchResults({ results }: SearchResultsProps) {
  const { colors } = useTheme();

  if (results.length === 0) return null;

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="search" size={16} color={colors.primary} />
        <Text style={[styles.headerText, { color: colors.text }]}>Web Results</Text>
      </View>
      {results.map((result, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.resultCard, { borderColor: colors.border }]}
          onPress={() => openUrl(result.url)}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.source, { color: colors.primary }]}>{result.source}</Text>
            <Ionicons name="open-outline" size={14} color={colors.textMuted} />
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {result.title}
          </Text>
          {result.snippet && (
            <Text style={[styles.snippet, { color: colors.textMuted }]} numberOfLines={2}>
              {result.snippet}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCard: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  source: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  snippet: {
    fontSize: 12,
    lineHeight: 18,
  },
});
