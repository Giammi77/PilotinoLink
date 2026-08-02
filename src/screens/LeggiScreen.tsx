import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import type { useEepromSerial } from '../serial/useEepromSerial';
import { insertBackup } from '../db/database';

interface Props {
  eeprom: ReturnType<typeof useEepromSerial>;
  onSaved: () => void;
}

export default function LeggiScreen({ eeprom, onSaved }: Props) {
  const [description, setDescription] = useState('');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isConnected = eeprom.connectedDeviceId != null;
  const isReading = eeprom.phase === 'reading';
  const hasReadValues = eeprom.phase === 'done-read' && !!eeprom.lastReadValues;

  const onRead = () => {
    setSavedMessage(null);
    setSaveError(null);
    eeprom.startRead();
  };

  const onSave = async () => {
    if (!eeprom.lastReadValues) return;
    setSaving(true);
    setSaveError(null);
    try {
      const desc = description.trim() || 'Backup senza descrizione';
      await insertBackup(desc, eeprom.lastReadValues);
      setSavedMessage(`Salvato: "${desc}" (${eeprom.lastReadValues.length} byte)`);
      setDescription('');
      onSaved();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setSaveError(msg);
      Alert.alert('Errore salvataggio', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leggi EEPROM</Text>
      <Text style={styles.hint}>Legge i 100 byte dell'EEPROM dal device connesso.</Text>

      <Pressable
        style={[styles.button, (!isConnected || isReading) && styles.buttonDisabled]}
        disabled={!isConnected || isReading}
        onPress={onRead}
      >
        {isReading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Leggi</Text>}
      </Pressable>

      {isReading && <Text style={styles.progress}>Byte letti: {eeprom.progress}/100</Text>}

      {!isConnected && (
        <Text style={styles.warning}>Connetti prima un device dalla barra in alto.</Text>
      )}

      {eeprom.phase === 'error' && eeprom.errorMessage && (
        <Text style={styles.error}>Errore lettura: {eeprom.errorMessage}</Text>
      )}

      {hasReadValues && (
        <View style={styles.readResultCard}>
          <Text style={styles.readResultTitle}>
            Lettura completata: {eeprom.lastReadValues!.length} byte
          </Text>

          <Text style={styles.label}>Descrizione configurazione</Text>
          <TextInput
            style={styles.input}
            placeholder="es. Setup gara 31/07"
            placeholderTextColor="#8b979d"
            value={description}
            onChangeText={setDescription}
          />

          <Pressable
            style={[styles.button, saving && styles.buttonDisabled]}
            disabled={saving}
            onPress={onSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Salva nell'archivio</Text>
            )}
          </Pressable>

          {saveError && <Text style={styles.error}>Errore salvataggio: {saveError}</Text>}
        </View>
      )}

      {savedMessage && <Text style={styles.success}>{savedMessage}</Text>}

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
  label: { fontSize: 13, color: '#5c6b73', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d7dcdd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a2226',
    backgroundColor: '#fff',
  },
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
  readResultCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d7dcdd',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  readResultTitle: { fontSize: 14, fontWeight: '600', color: '#2f8a4b' },
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
