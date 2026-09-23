import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Music, Clock, User, Play } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { api } from '../api/client';
import { StatCard } from '../components\StatCard';

const formatMs = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const HomeScreen = () => {
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
        <Text style={styles.title}>Spotify Live Wrap</Text>
        <Text style={styles.subtitle}>Your real-time musical journey</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          icon={<Clock color={THEME.colors.accent} size={20} />} 
          label="Total Time" 
          value={stats ? formatMs(stats.totalTime) : '0s'} 
          sub="All time" 
        />
        <StatCard 
          icon={<Music color={THEME.colors.primary} size={20} />} 
          label="Tracks Tracked" 
          value={stats ? stats.totalTracks.toString() : '0'} 
          sub="Unique songs" 
        />
        <StatCard 
          icon={<User color={THEME.colors.secondary} size={20} />} 
          label="Top Artists" 
          value={stats ? stats.totalArtists.toString() : '0'} 
          sub="Most played" 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Insights</Text>
        <View style={styles.insightCard}>
          <Play color={THEME.colors.primary} size={24} />
          <Text style={styles.insightText}>
            Your top artist is currently <Text style={styles.highlight}>{stats?.topArtists[0]?.name || 'unknown'}</Text>
          </Text>
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
  statsGrid: {
    marginBottom: THEME.spacing.xl,
  },
  section: {
    marginTop: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  insightCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  insightText: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  highlight: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  errorText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

export default HomeScreen;