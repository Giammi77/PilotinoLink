import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Share, Alert } from 'react-native';
import { listBackups, deleteBackup, csvToValues, type BackupRecord } from '../db/database';

interface Props {
  onUseForWrite: (backup: BackupRecord) => void;
  refreshKey: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ArchivioScreen({ onUseForWrite, refreshKey }: Props) {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    listBackups().then(setBackups);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    listBackups()
      .then(setBackups)
      .finally(() => setRefreshing(false));
  }, []);

  const onDelete = useCallback(
    (id: number) => {
      deleteBackup(id).then(load);
    },
    [load],
  );

  const onExport = useCallback(async (item: BackupRecord) => {
    const values = csvToValues(item.values);
    // Un valore per riga, -1 inclusi senza filtri: stesso formato del vecchio EEpromBackup.txt,
    // cosi' si puo' confrontare riga per riga con quello che si aspetta il device.
    const content = values.map(v => String(v)).join('\n') + '\n';
    const fileName = item.description.replace(/[\\/:*?"<>|]/g, '_') + '.txt';
    try {
      await Share.share({ message: content, title: fileName });
    } catch (err: any) {
      Alert.alert('Errore esportazione', err?.message ?? String(err));
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Archivio</Text>
      <Text style={styles.hint}>Backup salvati localmente, ordinati dal più recente.</Text>

      <FlatList
        data={backups}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={backups.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.empty}>Nessun backup salvato.</Text>}
        renderItem={({ item }) => {
          const values = csvToValues(item.values);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.description}</Text>
              <Text style={styles.cardMeta}>
                {formatDate(item.createdAt)} · {values.length} byte
              </Text>
              <View style={styles.actions}>
                <Pressable style={styles.actionBtn} onPress={() => onUseForWrite(item)}>
                  <Text style={styles.actionText}>Usa per scrittura</Text>
                </Pressable>
                <Pressable style={styles.actionBtn} onPress={() => onExport(item)}>
                  <Text style={styles.actionText}>Esporta .txt</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => onDelete(item.id)}>
                  <Text style={[styles.actionText, styles.deleteText]}>Elimina</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 4 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a2226' },
  hint: { fontSize: 13, color: '#5c6b73', marginBottom: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#8b979d', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7dcdd',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a2226' },
  cardMeta: { fontSize: 12, color: '#8b979d', marginTop: 2, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: '#f4e3cf',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: { color: '#b8691f', fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#f6e3e0' },
  deleteText: { color: '#c0392b' },
});
