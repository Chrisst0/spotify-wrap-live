import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { api } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORY_DURATION = 5000;

const WrappedScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    const autoAdvance = setTimeout(() => {
      setCurrentStoryIndex(idx => (idx < stories.length - 1 ? idx + 1 : 0));
    }, STORY_DURATION);

    return () => {
      clearInterval(timer);
      clearTimeout(autoAdvance);
    };
  }, [currentStoryIndex]);

  useEffect(() => {
    setProgress(0);
  }, [currentStoryIndex]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading your story...</Text>
      </View>
    );
  }

  const stories = [
    {
      id: 'intro',
      title: 'Your Live Wrapped',
      content: () => (
        <View style={styles.storyContent}>
          <View style={styles.iconCircle}>
            <View style={styles.glow} />
            <Text style={styles.emoji}>🎵</Text>
          </View>
          <Text style={styles.storyTitle}>Always <Text style={styles.highlight}>Running.</Text></Text>
          <Text style={styles.storySubtitle}>Your listening habits, tracked second by second.</Text>
        </View>
      ),
      bg: THEME.colors.background,
    },
    {
      id: 'time',
      title: 'Total Time',
      content: () => (
        <View style={styles.storyContent}>
          <Text style={styles.label}>Total Listening</Text>
          <Text style={styles.bigValue}>{formatMs(stats?.totalTime)}</Text>
          <Text style={styles.storySubtitle}>of pure musical bliss</Text>
        </View>
      ),
      bg: '#1e3a8a33', // blue-900/20
    },
    {
      id: 'artist',
      title: 'Top Artist',
      content: () => {
        const topArtist = stats?.topArtists[0];
        return (
          <View style={styles.storyContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              <Image 
                source={{ uri: topArtist?.image || 'https://via.placeholder.com/200' }} 
                style={styles.avatar} 
              />
            </View>
            <Text style={styles.label}>Your #1 Artist</Text>
            <Text style={styles.storyTitle}>{topArtist?.name || 'Unknown'}</Text>
          </View>
        );
      },
      bg: '#581c8733', // purple-900/20
    },
    {
      id: 'tracks',
      title: 'Top Tracks',
      content: () => (
        <View style={styles.storyContent}>
          <Text style={styles.label}>Most Played</Text>
          <View style={styles.tracksList}>
            {stats?.topTracks?.slice(0, 5).map((track: any, i: number) => (
              <View key={i} style={styles.trackItem}>
                <Image source={{ uri: track.image || 'https://via.placeholder.com/48' }} style={styles.trackArt} />
                <Text style={styles.trackName}>{track.name}</Text>
                <Text style={styles.trackTime}>{formatMs(track.duration)}</Text>
              </View>
            ))}
          </View>
        </View>
      ),
      bg: '#064e3b33', // green-900/20
    },
  ];

  const current = stories[currentStoryIndex];

  return (
    <View style={[styles.container, { backgroundColor: current.bg }]}>
      <View style={styles.progressBarContainer}>
        {stories.map((_, i) => (
          <View key={i} style={styles.progressSlot}>
            <View 
              style={[
                styles.progressFill, 
                { width: i < currentStoryIndex ? '100%' : i === currentStoryIndex ? `${progress}%` : '0%' }
              ]} 
            />
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => {}} // In a real app, this would navigate back
      >
        <X color={THEME.colors.textSecondary} size={32} />
      </TouchableOpacity>

      <View style={styles.navControls}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => setCurrentStoryIndex(prev => Math.max(0, prev - 1))}
        >
          <ChevronLeft color="white" size={40} opacity={0.3} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => setCurrentStoryIndex(prev => Math.min(stories.length - 1, prev + 1))}
        >
          <ChevronRight color="white" size={40} opacity={0.3} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        {current.content()}
      </View>

      <View style={styles.footer}>
        <View style={styles.liveIndicator} />
        <Text style={styles.footerText}>Live Wrapped</Text>
      </View>
    </View>
  );
};

const formatMs = (ms: number) => {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  progressSlot: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
  },
  navControls: {
    position: 'absolute',
    inset: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  navButton: {
    padding: 20,
  },
  mainContent: {
    width: '100%',
    alignItems: 'center',
    padding: 40,
  },
  storyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
    zIndex: 1,
  },
  glow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: THEME.colors.primary,
    opacity: 0.3,
    blurRadius: 20, // Note: blurRadius is iOS only
  },
  emoji: {
    fontSize: 60,
  },
  storyTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -2,
  },
  highlight: {
    color: THEME.colors.primary,
  },
  storySubtitle: {
    fontSize: 18,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  bigValue: {
    fontSize: 72,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: THEME.colors.secondary,
    opacity: 0.3,
    zIndex: -1,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: THEME.colors.background,
    backgroundColor: THEME.colors.surface,
  },
  tracksList: {
    width: '100%',
    gap: 12,
  },
  trackItem: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trackArt: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: THEME.colors.border,
  },
  trackName: {
    flex: 1,
    marginLeft: 12,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  trackTime: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    opacity: 0.8,
  },
  footerText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default WrappedScreen;