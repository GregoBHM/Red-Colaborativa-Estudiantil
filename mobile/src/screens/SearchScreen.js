import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchDoubts, fetchSubjects } from '../services/doubtsApi';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function SearchScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [sortBy, setSortBy] = useState('recent');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchSubjects().then(setSubjects).catch(() => {});
  }, []);

  const doSearch = useCallback(async (text, subjectId, sort) => {
    if (text.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchDoubts(text, {
        subjectId,
        sort,
      });
      setResults(data);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(searchQuery, selectedSubject, sortBy);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSubject, sortBy, doSearch]);

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Hace un momento';
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Buscar Dudas</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título o descripción..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'recent' && styles.filterChipActive]}
            onPress={() => setSortBy('recent')}
          >
            <Ionicons name="time-outline" size={14} color={sortBy === 'recent' ? COLORS.textLight : COLORS.textMuted} />
            <Text style={[styles.filterChipText, sortBy === 'recent' && styles.filterChipTextActive]}>Recientes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, sortBy === 'likes' && styles.filterChipActive]}
            onPress={() => setSortBy('likes')}
          >
            <Ionicons name="heart-outline" size={14} color={sortBy === 'likes' ? COLORS.textLight : COLORS.textMuted} />
            <Text style={[styles.filterChipText, sortBy === 'likes' && styles.filterChipTextActive]}>Populares</Text>
          </TouchableOpacity>
          {selectedSubject && (
            <TouchableOpacity
              style={[styles.filterChip, styles.filterChipActive]}
              onPress={() => setSelectedSubject(null)}
            >
              <Ionicons name="close" size={14} color={COLORS.textLight} />
              <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
                {subjects.find(s => s.id === selectedSubject)?.name || 'Materia'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DoubtDetail', { doubtId: item.id, doubt: item })}
            >
              <View style={styles.resultLeft}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: item.status === 'open' ? COLORS.success : COLORS.textMuted }
                ]} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
                <View style={styles.resultMeta}>
                  {item.subject_name && (
                    <View style={styles.resultTag}>
                      <Text style={styles.resultTagText}>{item.subject_name}</Text>
                    </View>
                  )}
                  <Text style={styles.resultTime}>{getTimeAgo(item.created_at)}</Text>
                  <View style={styles.resultStat}>
                    <Ionicons name="heart" size={12} color={COLORS.error} />
                    <Text style={styles.resultStatText}>{item.likes_count}</Text>
                  </View>
                  <View style={styles.resultStat}>
                    <Ionicons name="chatbubble" size={12} color={COLORS.primary} />
                    <Text style={styles.resultStatText}>{item.comments_count}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.centerWrap}>
          <View style={styles.emptyIconBg}>
            <Ionicons
              name={hasSearched ? "search-outline" : "search"}
              size={36}
              color={hasSearched ? COLORS.textMuted : COLORS.primary}
            />
          </View>
          <Text style={styles.emptyText}>
            {hasSearched ? 'Sin resultados' : 'Encuentra soluciones'}
          </Text>
          <Text style={styles.emptySub}>
            {hasSearched
              ? 'Intenta con otros términos o cambia los filtros.'
              : 'Escribe al menos 2 letras para buscar dudas de otros estudiantes.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: '800',
    color: COLORS.textLight, marginBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, height: 44,
  },
  searchInput: {
    flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.sm, fontWeight: '500',
  },
  filtersRow: {
    flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
  },
  filterChipText: {
    fontSize: FONTS.sizes.xs, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
  },
  filterChipTextActive: {
    color: COLORS.textLight,
  },
  listContent: { padding: SPACING.md, paddingBottom: 100 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    padding: SPACING.md, borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
    ...SHADOWS.soft, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  resultLeft: { marginRight: SPACING.md },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  resultInfo: { flex: 1 },
  resultTitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '700',
    marginBottom: 2,
  },
  resultDesc: {
    fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  resultTag: {
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  resultTagText: { color: COLORS.primary, fontSize: 10, fontWeight: '600' },
  resultTime: { fontSize: 10, color: COLORS.textMuted },
  resultStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultStatText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  centerWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md, fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  emptyIconBg: {
    width: 72, height: 72, borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderLight, alignItems: 'center',
    justifyContent: 'center', marginBottom: SPACING.lg,
  },
  emptyText: {
    fontSize: FONTS.sizes.lg, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  emptySub: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
});
