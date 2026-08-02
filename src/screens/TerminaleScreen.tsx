import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import type { useEepromSerial } from '../serial/useEepromSerial';

interface Props {
  eeprom: ReturnType<typeof useEepromSerial>;
}

// Scorciatoie note dal menu del firmware (menu(), list()/listCalibration()/listConfiguration()/listDinamic()).
const QUICK_KEYS = [
  { key: 'a', label: 'a — dynamic' },
  { key: 'b', label: 'b — calib' },
  { key: 'c', label: 'c — config' },
  { key: ' ', label: 'spazio — rilista' },
  { key: 'z', label: 'z — esci' },
];

export default function TerminaleScreen({ eeprom }: Props) {
  const [input, setInput] = useState('');
  const isConnected = eeprom.connectedDeviceId != null;

  const send = (text: string) => {
    if (!isConnected || text.length === 0) return;
    eeprom.sendTerminalText(text);
  };

  const onSendInput = () => {
    send(input);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Terminale seriale</Text>
      <Text style={styles.hint}>
        Dialogo libero con il device: naviga il menu del firmware (calibrazioni, config, parametri) inviando i
        caratteri che userebbe la seriale del PC.
      </Text>

      {!isConnected && <Text style={styles.warning}>Connetti prima un device dalla barra in alto.</Text>}

      <View style={styles.quickRow}>
        {QUICK_KEYS.map(q => (
          <Pressable
            key={q.key}
            style={[styles.quickBtn, !isConnected && styles.quickBtnDisabled]}
            disabled={!isConnected}
            onPress={() => send(q.key)}
          >
            <Text style={styles.quickBtnText}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.terminalBox}>
        <ScrollView nestedScrollEnabled>
          <Text style={styles.terminalText}>
            {eeprom.terminalText || '(nessun testo ricevuto ancora)'}
          </Text>
        </ScrollView>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Testo o carattere da inviare..."
          placeholderTextColor="#8b979d"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={onSendInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.sendBtn, (!isConnected || input.length === 0) && styles.quickBtnDisabled]}
          disabled={!isConnected || input.length === 0}
          onPress={onSendInput}
        >
          <Text style={styles.sendBtnText}>Invia</Text>
        </Pressable>
      </View>

      <Pressable style={styles.clearBtn} onPress={eeprom.clearTerminal}>
        <Text style={styles.clearBtnText}>Pulisci terminale</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a2226' },
  hint: { fontSize: 13, color: '#5c6b73', lineHeight: 18 },
  warning: { fontSize: 13, color: '#b8691f' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    backgroundColor: '#f4e3cf',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickBtnDisabled: { backgroundColor: '#e3e6e7' },
  quickBtnText: { color: '#b8691f', fontWeight: '600', fontSize: 13 },
  terminalBox: {
    flex: 1,
    backgroundColor: '#0d1013',
    borderRadius: 8,
    padding: 10,
    minHeight: 220,
  },
  terminalText: {
    color: '#7de08d',
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7dcdd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1a2226',
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: '#b8691f',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearBtn: { alignItems: 'center', padding: 8 },
  clearBtnText: { color: '#5c6b73', fontSize: 12 },
});
