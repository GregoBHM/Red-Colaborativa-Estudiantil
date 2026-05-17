import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setResults([
        { id: 1, title: `Resultado para "${text}" en Matemáticas`, subject: 'Matemáticas' },
        { id: 2, title: `Otro resultado sobre "${text}"`, subject: 'Física' },
      ]);
    } else {
      setResults([]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buscar</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar dudas, temas o compañeros..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultCard} activeOpacity={0.7}>
              <View style={styles.resultIcon}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.resultInfo}>
                <View style={styles.resultTag}>
                  <Text style={styles.resultTagText}>{item.subject}</Text>
                </View>
                <Text style={styles.resultTitle}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="search" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyText}>Encuentra soluciones</Text>
          <Text style={styles.emptySub}>Escribe al menos 3 letras para buscar dudas resueltas por otros estudiantes.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 48, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textLight, marginBottom: SPACING.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, height: 44,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, marginLeft: SPACING.sm, fontWeight: '500' },
  listContent: { padding: SPACING.md, paddingBottom: 100 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: SPACING.md,
    borderRadius: RADIUS.xs, marginBottom: SPACING.sm, ...SHADOWS.soft, borderWidth: 1, borderColor: COLORS.borderLight,
  },
  resultIcon: {
    width: 40, height: 40, borderRadius: RADIUS.xs, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  resultInfo: { flex: 1 },
  resultTag: { alignSelf: 'flex-start', backgroundColor: COLORS.primarySoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, marginBottom: 4 },
  resultTagText: { color: COLORS.primary, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  resultTitle: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, fontWeight: '600' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  emptyIconBg: { width: 72, height: 72, borderRadius: RADIUS.full, backgroundColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
