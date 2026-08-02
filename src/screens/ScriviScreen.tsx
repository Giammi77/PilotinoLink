import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import type { useEepromSerial } from '../serial/useEepromSerial';
import { csvToValues, type BackupRecord } from '../db/database';

interface Props {
  eeprom: ReturnType<typeof useEepromSerial>;
  selectedBackup: BackupRecord | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ScriviScreen({ eeprom, selectedBackup }: Props) {
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const isConnected = eeprom.connectedDeviceId != null;
  const isWriting = eeprom.phase === 'writing';

  useEffect(() => {
    if (eeprom.phase === 'done-write' && eeprom.lastWriteCount != null) {
      setResultMessage(`Scrittura completata: ${eeprom.lastWriteCount} byte confermati dal device.`);
    }
  }, [eeprom.phase, eeprom.lastWriteCount]);

  const onWrite = () => {
    if (!selectedBackup) return;
    const values = csvToValues(selectedBackup.values);
    Alert.alert(
      'Conferma scrittura',
      `Stai per scrivere "${selectedBackup.description}" (${values.length} byte) sul device connesso. L'operazione sovrascrive l'EEPROM. Procedere?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Scrivi',
          style: 'destructive',
          onPress: () => {
            setResultMessage(null);
            eeprom.startWrite(values);
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scrivi EEPROM</Text>
      <Text style={styles.hint}>
        Scrive sul device un backup scelto dall'Archivio ("Usa per scrittura").
      </Text>

      {selectedBackup ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedTitle}>{selectedBackup.description}</Text>
          <Text style={styles.selectedMeta}>
            {formatDate(selectedBackup.createdAt)} · {csvToValues(selectedBackup.values).length} byte
          </Text>
        </View>
      ) : (
        <Text style={styles.warning}>
          Nessun backup selezionato. Vai in Archivio e scegli "Usa per scrittura".
        </Text>
      )}

      <Pressable
        style={[
          styles.button,
          (!isConnected || !selectedBackup || isWriting) && styles.buttonDisabled,
        ]}
        disabled={!isConnected || !selectedBackup || isWriting}
        onPress={onWrite}
      >
        {isWriting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Scrivi sul device</Text>}
      </Pressable>

      {isWriting && <Text style={styles.progress}>Byte scritti: {eeprom.progress}/100</Text>}

      {!isConnected && (
        <Text style={styles.warning}>Connetti prima un device dalla barra in alto.</Text>
      )}

      {resultMessage && <Text style={styles.success}>{resultMessage}</Text>}

      {eeprom.phase === 'error' && eeprom.errorMessage && (
        <Text style={styles.error}>Errore: {eeprom.errorMessage}</Text>
      )}

      <Text style={styles.logTitle}>Log traffico seriale</Text>
      <View style={styles.logBox}>
        <ScrollView nestedScrollEnabled>
          {eeprom.log.length === 0 ? (
            <Text style={styles.logEmpty}>Nessun evento ancora.</Text>
          ) : (
            eeprom.log.map((line, idx) => (
              <Text key={idx} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a2226' },
  hint: { fontSize: 13, color: '#5c6b73', lineHeight: 18 },
  selectedCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7dcdd',
    borderRadius: 10,
    padding: 14,
  },
  selectedTitle: { fontSize: 15, fontWeight: '600', color: '#1a2226' },
  selectedMeta: { fontSize: 12, color: '#8b979d', marginTop: 2 },
  button: {
    backgroundColor: '#b8691f',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#c9ccce' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  progress: { fontSize: 13, color: '#5c6b73' },
  warning: { fontSize: 13, color: '#b8691f' },
  success: { fontSize: 13, color: '#2f8a4b', fontWeight: '600' },
  error: { fontSize: 13, color: '#c0392b' },
  logTitle: { fontSize: 13, color: '#5c6b73', marginTop: 16 },
  logBox: {
    height: 260,
    backgroundColor: '#0d1013',
    borderRadius: 8,
    padding: 10,
  },
  logEmpty: { color: '#5c6b73', fontSize: 12 },
  logLine: {
    color: '#7de08d',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
