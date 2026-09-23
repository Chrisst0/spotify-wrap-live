import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Music, User, Disc } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { api } from '../api/client';

const StatsScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch statistics');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Deep Dive</Text>
        <Text style={styles.subtitle}>Your listening patterns revealed</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User color={THEME.colors.secondary} size={24} />
          <Text style={styles.sectionTitle}>Top Artists</Text>
        </View>
        <View style={styles.list}>
          {stats?.topArtists?.map((artist: any, i: number) => (
            <View key={i} style={styles.item}>
              <Image source={{ uri: artist.image || 'https://via.placeholder.com/48' }} style={styles.avatar} />
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{artist.name}</Text>
                <Text style={styles.itemSub}>{i + 1}º Rank</Text>
              </View>
              <Text style={styles.itemValue}>{artist.duration ? `${(artist.duration / 60000).toFixed(1)}m` : 'N/A'}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Disc color={THEME.colors.primary} size={24} />
          <Text style={styles.sectionTitle}>Top Tracks</Text>
        </View>
        <View style={styles.list}>
          {stats?.topTracks?.map((track: any, i: number) => (
            <View key={i} style={styles.item}>
              <Image source={{ uri: track.image || 'https://via.placeholder.com/48' }} style={styles.trackArt} />
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{track.name}</Text>
                <Text style={styles.itemSub}>#{i + 1} Most Played</Text>
              </View>
              <Text style={styles.itemValue}>{track.duration ? `${(track.duration / 60000).toFixed(1)}m` : 'N/A'}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: THEME.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginBottom: THEME.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  list: {
    gap: THEME.spacing.sm,
  },
  item: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.border,
  },
  trackArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: THEME.colors.border,
  },
  itemText: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  itemName: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSub: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  itemValue: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  errorText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default StatsScreen;