# PilotinoLink

App Android companion per **Pilotino**, l'autopilota per alianti RC (DLG). Permette di leggere, archiviare e riscrivere i parametri salvati nella EEPROM del firmware, collegando il telefono al device via cavo USB-OTG — senza passare dal PC.

## Perché esiste

Il firmware (`pilotino_20260224.ino`) espone un piccolo protocollo seriale per fare backup/restore dei parametri di volo (guadagni, calibrazioni, config), pensato originariamente per essere pilotato da uno sketch Processing sul PC. PilotinoLink porta lo stesso flusso sul telefono, con in più un archivio locale per tenere più configurazioni salvate (es. setup diversi per gare/condizioni) e poterle riscrivere su un altro device.

## Funzionalità

- **Leggi** — legge i 100 byte di parametri dalla EEPROM del device connesso.
- **Archivio** — salva ogni lettura in un database locale (SQLite) con descrizione e data; da qui si esporta un backup come `.txt` (un valore per riga) o lo si seleziona per riscriverlo.
- **Scrivi** — riscrive un backup salvato su un device (anche diverso da quello con cui è stato letto), con conferma prima di sovrascrivere.
- **Terminale** — console seriale libera per navigare a mano il menu del firmware (calibrazioni, config, parametri singoli), non solo il flusso dedicato di backup/restore.

## Come funziona il protocollo

- Ogni byte del backup corrisponde all'indirizzo EEPROM `490 + indice` (`GYRO_DRIFT_ADR` è l'origine usata dal firmware).
- La lettura (`rEEprom()`) trasferisce 100 byte, marcati dal byte `0x80` (`-128`) di inizio.
- La scrittura (`wEEprom()`) invia i valori a coppie `[-128, valore]`, con conferma via eco per ognuno. Il firmware scrive in EEPROM il valore del pacchetto *precedente* (pipeline sfasata di un ciclo): per questo l'ultimo pacchetto inviato è un "flush" che serve solo a far scrivere davvero l'ultimo valore reale.
- Dei 100 byte, solo il blocco di indirizzi 542–557 corrisponde a parametri modificabili da menu (`parWrite()`); il resto sono dati di calibrazione scritti da routine automatiche.

## Stack tecnico

- React Native 0.86 (New Architecture), TypeScript
- [`@serserm/react-native-turbo-serialport`](https://github.com/serserm/react-native-turbo-serialport) per l'accesso USB host (CDC-ACM)
- [`@op-engineering/op-sqlite`](https://github.com/OP-Engineering/op-sqlite) per l'archivio locale

## Requisiti hardware

- Telefono Android con supporto USB-OTG (attivo nelle impostazioni)
- Cavo/hub OTG — preferibilmente alimentato esternamente, l'alimentazione erogata dal telefono in modalità host è spesso insufficiente
- Device con USB seriale nativo CDC-ACM (es. SparkFun Pro Micro / ATmega32U4); chip USB-seriale esterni come CH340/FTDI non sono coperti dal filtro dispositivi di default (vedi `android/app/src/main/res/xml/usb_device_filter.xml`)

## Build

```sh
npm install
cd android
./gradlew assembleRelease
```

L'APK firmato con la keystore di debug (va bene per uso personale) si trova in `android/app/build/outputs/apk/release/app-release.apk`.
