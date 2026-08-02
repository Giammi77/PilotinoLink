import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, FlatList } from 'react-native';
import type { useEepromSerial } from '../serial/useEepromSerial';

interface UsbDeviceInfo {
  deviceId: number;
  deviceName: string;
  vendorId: number;
  productId: number;
  productName: string;
  isSupported: boolean;
}

interface Props {
  eeprom: ReturnType<typeof useEepromSerial>;
}

export default function ConnectionBar({ eeprom }: Props) {
  const [devices, setDevices] = useState<UsbDeviceInfo[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const isConnected = eeprom.connectedDeviceId != null;

  const onSearch = () => {
    eeprom.listDevices().then((found: UsbDeviceInfo[]) => {
      setDevices(found ?? []);
      setPickerVisible(true);
    });
  };

  return (
    <View>
      <View style={styles.bar}>
        <View style={[styles.dot, isConnected && styles.dotConnected]} />
        <Text style={styles.status}>
          {isConnected ? `Connesso (device #${eeprom.connectedDeviceId})` : 'Non connesso'}
        </Text>
        <Pressable
          style={styles.button}
          onPress={isConnected ? eeprom.disconnect : onSearch}
        >
          <Text style={styles.buttonText}>{isConnected ? 'Disconnetti' : 'Connetti'}</Text>
        </Pressable>
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleziona dispositivo</Text>
            <FlatList
              data={devices}
              keyExtractor={item => String(item.deviceId)}
              ListEmptyComponent={<Text style={styles.empty}>Nessun dispositivo trovato.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.deviceRow}
                  onPress={() => {
                    eeprom.connect(item.deviceId);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.deviceName}>{item.productName || item.deviceName}</Text>
                  <Text style={styles.deviceMeta}>
                    VID {item.vendorId} · PID {item.productId}
                    {!item.isSupported ? ' · non supportato' : ''}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.closeBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.closeText}>Chiudi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#d7dcdd',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8a97a0' },
  dotConnected: { backgroundColor: '#2f8a4b' },
  status: { flex: 1, fontSize: 13, color: '#1a2226' },
  button: { backgroundColor: '#b8691f', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#1a2226' },
  empty: { color: '#8b979d', fontSize: 14, paddingVertical: 12 },
  deviceRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef1f2' },
  deviceName: { fontSize: 14, fontWeight: '600', color: '#1a2226' },
  deviceMeta: { fontSize: 12, color: '#8b979d', marginTop: 2 },
  closeBtn: { marginTop: 12, alignItems: 'center', padding: 10 },
  closeText: { color: '#b8691f', fontWeight: '600' },
});
