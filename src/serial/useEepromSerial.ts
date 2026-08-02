import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DriverType,
  Mode as SerialMode,
  ReturnedDataType,
  initSerialport,
  useSerialport,
} from '@serserm/react-native-turbo-serialport';
import { EepromStateMachine } from './stateMachine';

initSerialport({
  autoConnect: false,
  mode: SerialMode.ASYNC,
  params: {
    driver: DriverType.AUTO,
    portInterface: -1,
    returnedDataType: ReturnedDataType.INTARRAY,
    baudRate: 9600,
  },
});

export type EepromPhase = 'idle' | 'reading' | 'writing' | 'done-read' | 'done-write' | 'error';

export function useEepromSerial() {
  const [connectedDeviceId, setConnectedDeviceId] = useState<number | null>(null);
  const [phase, setPhase] = useState<EepromPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastReadValues, setLastReadValues] = useState<number[] | null>(null);
  const [lastWriteCount, setLastWriteCount] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [terminalText, setTerminalText] = useState('');
  // Interfaccia 1 = canale dati CDC-ACM (confermato funzionante su SparkFun Pro Micro);
  // l'interfaccia 0 e' quella di controllo e non viene letta da Serial.read() sul firmware.
  const [writePortInterface, setWritePortInterface] = useState<number>(1);
  const writePortInterfaceRef = useRef(1);

  const appendLog = useCallback((line: string) => {
    const ts = new Date().toISOString().slice(11, 23);
    setLog(prev => [...prev.slice(-199), `${ts} ${line}`]);
  }, []);

  const machineRef = useRef<EepromStateMachine | null>(null);
  const deviceIdRef = useRef<number | null>(null);
  const serialportRef = useRef<ReturnType<typeof useSerialport> | null>(null);

  const serialport = useSerialport({
    onError: ({ errorMessage: msg }: { errorMessage: string }) => {
      appendLog(`ERRORE: ${msg}`);
      setErrorMessage(msg);
      setPhase('error');
    },
    onConnected: ({ deviceId }: { deviceId: number }) => {
      appendLog(`onConnected device #${deviceId}`);
      deviceIdRef.current = deviceId;
      setConnectedDeviceId(deviceId);
    },
    onDisconnected: () => {
      appendLog('onDisconnected');
      deviceIdRef.current = null;
      setConnectedDeviceId(null);
    },
    onReadData: ({ data, portInterface }: { data: any; portInterface?: number }) => {
      const bytes: number[] = Array.isArray(data) ? data : [];
      appendLog(`<- ricevuti ${bytes.length} byte su interfaccia ${portInterface}: [${bytes.join(', ')}]`);

      const decoded = bytes
        .map(b => (b >= 32 && b < 127 ? String.fromCharCode(b) : b === 10 ? '\n' : b === 13 ? '' : `[${b}]`))
        .join('');
      setTerminalText(prev => (prev + decoded).slice(-4000));

      const machine = machineRef.current;
      if (!machine) {
        appendLog('!! macchina a stati non ancora pronta, byte scartati');
        return;
      }
      for (const raw of bytes) {
        const signed = raw >= 128 ? raw - 256 : raw;
        machine.handleByte(signed);
      }
      appendLog(`stato dopo elaborazione: mode=${machine.mode} step=${machine.step} i=${machine.i}`);
    },
  });

  // serialport (dall'hook della libreria) cambia identita' ad ogni render: lo teniamo in un ref
  // cosi' writeByte resta stabile e non forza la ricreazione della macchina a stati ad ogni render.
  serialportRef.current = serialport;

  const writeByte = useCallback((value: number) => {
    if (deviceIdRef.current == null) {
      appendLog(`!! writeByte(${value}) IGNORATO: nessun device connesso (deviceIdRef=null)`);
      return;
    }
    const iface = writePortInterfaceRef.current;
    appendLog(`-> invio byte ${value} (device #${deviceIdRef.current}, interfaccia ${iface})`);
    try {
      serialportRef.current!.writeBytes([value & 0xff], deviceIdRef.current, iface);
    } catch (err: any) {
      appendLog(`!! ECCEZIONE in writeBytes: ${err?.message ?? err}`);
    }
  }, [appendLog]);

  const writeBytesBatch = useCallback(
    (values: number[]) => {
      if (deviceIdRef.current == null) {
        appendLog(`!! writeBytes(${values.join(',')}) IGNORATO: nessun device connesso`);
        return;
      }
      const iface = writePortInterfaceRef.current;
      appendLog(`-> invio ${values.length} byte insieme: [${values.join(', ')}] (interfaccia ${iface})`);
      try {
        serialportRef.current!.writeBytes(
          values.map(v => v & 0xff),
          deviceIdRef.current,
          iface,
        );
      } catch (err: any) {
        appendLog(`!! ECCEZIONE in writeBytes (batch): ${err?.message ?? err}`);
      }
    },
    [appendLog],
  );

  const sendTerminalText = useCallback(
    (text: string) => {
      if (text.length === 0) return;
      setTerminalText(prev => (prev + '>> ' + text + '\n').slice(-4000));
      const bytes = Array.from(text).map(ch => ch.charCodeAt(0));
      writeBytesBatch(bytes);
    },
    [writeBytesBatch],
  );

  const clearTerminal = useCallback(() => setTerminalText(''), []);

  const changeWritePortInterface = useCallback(
    (iface: number) => {
      writePortInterfaceRef.current = iface;
      setWritePortInterface(iface);
      appendLog(`Interfaccia di scrittura impostata a ${iface}`);
    },
    [appendLog],
  );

  useEffect(() => {
    if (machineRef.current) return;
    machineRef.current = new EepromStateMachine({
      writeByte,
      writeBytes: writeBytesBatch,
      onReadProgress: i => setProgress(i),
      onReadComplete: values => {
        setLastReadValues(values);
        setPhase('done-read');
      },
      onWriteProgress: i => setProgress(i),
      onWriteComplete: count => {
        setLastWriteCount(count);
        setPhase('done-write');
      },
    });
  }, [writeByte, writeBytesBatch]);

  const listDevices = useCallback(() => {
    appendLog('Ricerca dispositivi USB...');
    return serialportRef.current!.listDevices().then((devices: any[]) => {
      appendLog(`Trovati ${devices?.length ?? 0} dispositivi`);
      for (const d of devices ?? []) {
        appendLog(
          `  device #${d.deviceId}: ${d.productName || d.deviceName}, interfaceCount=${d.interfaceCount}, supported=${d.isSupported}`,
        );
      }
      return devices;
    });
  }, [appendLog]);

  const connect = useCallback(
    (deviceId: number) => {
      appendLog(`Richiesta connessione a device #${deviceId}...`);
      serialportRef.current!.connect(deviceId);
    },
    [appendLog],
  );

  const disconnect = useCallback(() => {
    appendLog('Disconnessione richiesta');
    serialportRef.current!.disconnect();
  }, [appendLog]);

  const startRead = useCallback(() => {
    appendLog('=== Avvio lettura ===');
    setErrorMessage(null);
    setProgress(0);
    setLastReadValues(null);
    setPhase('reading');
    machineRef.current?.startRead();
  }, [appendLog]);

  const startWrite = useCallback(
    (values: number[]) => {
      appendLog(`=== Avvio scrittura (${values.length} byte) ===`);
      setErrorMessage(null);
      setProgress(0);
      setLastWriteCount(null);
      setPhase('writing');
      machineRef.current?.startWrite(values);
    },
    [appendLog],
  );

  return {
    connectedDeviceId,
    phase,
    progress,
    errorMessage,
    lastReadValues,
    lastWriteCount,
    log,
    terminalText,
    sendTerminalText,
    clearTerminal,
    writePortInterface,
    changeWritePortInterface,
    listDevices,
    connect,
    disconnect,
    startRead,
    startWrite,
  };
}
