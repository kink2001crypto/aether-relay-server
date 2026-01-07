import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../theme';

interface Conversation {
  projectPath: string;
  projectName: string;
  messageCount: number;
  lastMessage: string;
  lastMessageAt: string;
}

export default function HistoryScreen({ navigation }: any) {
  const { serverUrl, isConnected, currentProject, setCurrentProject, projects } = useApp();
  const { colors, isDarkMode } = useTheme();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      fetchConversations();
    }
  }, [isConnected, serverUrl]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/chat/conversations`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.log('Error fetching conversations:', error);
    }
    setLoading(false);
  };

  const handleDeleteConversation = (projectPath: string, projectName: string) => {
    Alert.alert(
      '🗑️ Delete Conversation?',
      `Delete all messages for "${projectName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${serverUrl}/api/chat/conversations`, {
                method: 'DELETE',
                headers: { 
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true' 
                },
                body: JSON.stringify({ projectPath })
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert('✅ Deleted', `${data.deleted} messages deleted`);
                fetchConversations();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete conversation');
            }
          }
        }
      ]
    );
  };

  const handleSelectConversation = (projectPath: string) => {
    // Find the project and set it as current
    const project = projects.find(p => p.path === projectPath);
    if (project) {
      setCurrentProject(project);
      navigation.navigate('Chat');
    } else {
      Alert.alert('Project Not Found', 'This project is no longer available');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const styles = createStyles(colors);

  const renderConversation = ({ item }: { item: Conversation }) => {
    const isActive = currentProject?.path === item.projectPath;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : colors.border }
        ]}
        onPress={() => handleSelectConversation(item.projectPath)}
      >
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <LinearGradient
              colors={isActive ? [colors.primary, colors.primaryDark] : [colors.surfaceLight, colors.surface]}
              style={styles.projectIcon}
            >
              <Ionicons name="folder" size={18} color={isActive ? '#fff' : colors.textMuted} />
            </LinearGradient>
            <View style={styles.conversationInfo}>
              <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                {item.projectName}
              </Text>
              <Text style={[styles.messageCount, { color: colors.textMuted }]}>
                {item.messageCount} messages
              </Text>
            </View>
            <Text style={[styles.timestamp, { color: colors.textMuted }]}>
              {formatDate(item.lastMessageAt)}
            </Text>
          </View>
          
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.lastMessage}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.error + '20' }]}
          onPress={() => handleDeleteConversation(item.projectPath, item.projectName)}
        >
          <Ionicons name="close" size={18} color={colors.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversations</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Start chatting with AI to see your history here
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Conversations</Text>
          <TouchableOpacity onPress={fetchConversations} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.projectPath}
          contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  listContent: { padding: 16 },
  emptyList: { flex: 1 },
  conversationCard: { flexDirection: 'row', borderRadius: 14, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  conversationContent: { flex: 1, padding: 14 },
  conversationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  projectIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  conversationInfo: { flex: 1 },
  projectName: { fontSize: 15, fontWeight: '600' },
  messageCount: { fontSize: 11, marginTop: 2 },
  timestamp: { fontSize: 11 },
  lastMessage: { fontSize: 13, lineHeight: 18 },
  deleteButton: { width: 44, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
});
