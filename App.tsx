/**
 * EEPROM Manager App
 * Backup/restore parametri EEPROM del "pilotino" via USB seriale.
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEepromSerial } from './src/serial/useEepromSerial';
import ConnectionBar from './src/screens/ConnectionBar';
import LeggiScreen from './src/screens/LeggiScreen';
import ArchivioScreen from './src/screens/ArchivioScreen';
import ScriviScreen from './src/screens/ScriviScreen';
import TerminaleScreen from './src/screens/TerminaleScreen';
import type { BackupRecord } from './src/db/database';

type Tab = 'leggi' | 'archivio' | 'scrivi' | 'terminale';

const TABS: { key: Tab; label: string }[] = [
  { key: 'leggi', label: 'Leggi' },
  { key: 'archivio', label: 'Archivio' },
  { key: 'scrivi', label: 'Scrivi' },
  { key: 'terminale', label: 'Terminale' },
];

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#eef1f2" />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const eeprom = useEepromSerial();
  const [tab, setTab] = useState<Tab>('leggi');
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [archiveRefreshKey, setArchiveRefreshKey] = useState(0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ConnectionBar eeprom={eeprom} />

      <View style={styles.tabBar}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'leggi' && (
          <LeggiScreen eeprom={eeprom} onSaved={() => setArchiveRefreshKey(k => k + 1)} />
        )}
        {tab === 'archivio' && (
          <ArchivioScreen
            refreshKey={archiveRefreshKey}
            onUseForWrite={backup => {
              setSelectedBackup(backup);
              setTab('scrivi');
            }}
          />
        )}
        {tab === 'scrivi' && <ScriviScreen eeprom={eeprom} selectedBackup={selectedBackup} />}
        {tab === 'terminale' && <TerminaleScreen eeprom={eeprom} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef1f2' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#d7dcdd' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#b8691f' },
  tabLabel: { fontSize: 14, color: '#5c6b73', fontWeight: '600' },
  tabLabelActive: { color: '#b8691f' },
  content: { flex: 1 },
});

export default App;
