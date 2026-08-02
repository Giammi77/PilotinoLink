export type EepromMode = 'read' | 'write' | null;

export interface StateMachineCallbacks {
  writeByte: (value: number) => void;
  writeBytes: (values: number[]) => void;
  onHandshakeChar?: (char: string) => void;
  onReadProgress?: (index: number, value: number) => void;
  onReadComplete: (values: number[]) => void;
  onWriteProgress?: (index: number) => void;
  onWriteComplete: (bytesWritten: number) => void;
}

// Porta 1:1 della macchina a stati validata in read_serial.html / simulate_state_machine.js:
// stessa sequenza di read.pde e write.pde (attesa 'R', marcatore -128, eco di conferma in scrittura).
export class EepromStateMachine {
  mode: EepromMode = null;
  step = 0;
  i = 0;
  private dumpValues: number[] = [];
  private dataVal: number[] = [];
  private totalRealValues = 0;

  constructor(private cb: StateMachineCallbacks) {}

  startRead() {
    this.mode = 'read';
    this.step = 2;
    this.i = 0;
    this.dumpValues = [];
    this.cb.writeByte('r'.charCodeAt(0));
  }

  startWrite(dataVal: number[]) {
    // wEEprom() sul firmware scrive in EEPROM il valore ricevuto al pacchetto PRECEDENTE
    // (pipeline sfasata di un ciclo): senza un pacchetto extra in coda, l'ultimo valore reale
    // non verrebbe mai commesso e tutti gli indirizzi risulterebbero scalati di uno.
    // Verificato con simulazione: questo allineamento produce 0 disallineamenti su 100 byte.
    this.dataVal = dataVal.length > 0 ? [...dataVal, dataVal[dataVal.length - 1]] : [];
    this.totalRealValues = dataVal.length;
    this.mode = 'write';
    this.step = 2;
    this.i = 0;
    this.cb.writeByte('w'.charCodeAt(0));
  }

  reset() {
    this.mode = null;
    this.step = 0;
    this.i = 0;
    this.dumpValues = [];
  }

  handleByte(inByte: number) {
    switch (this.step) {
      case 0:
        if (inByte === 'R'.charCodeAt(0)) {
          this.cb.writeByte(32); // ' ' — non eseguito nel flusso reale, mantenuto per fedeltà
          this.step = 1;
        }
        break;

      case 1:
        this.cb.onHandshakeChar?.(String.fromCharCode(inByte & 0xff));
        break;

      case 2:
        if (this.mode === 'read') {
          if (inByte === -128) this.step = 3;
        } else if (this.mode === 'write') {
          if (inByte === -128) {
            // wEEprom() nel firmware richiede "Serial.available() > 1": i due byte vanno
            // inviati insieme in un solo pacchetto, non con due scritture separate.
            this.cb.writeBytes([-128, this.dataVal[this.i]]);
            this.step = 3;
          }
        }
        break;

      case 3:
        if (this.mode === 'read') {
          this.dumpValues.push(inByte);
          this.cb.onReadProgress?.(this.i, inByte);
          this.cb.writeByte(inByte);
          this.cb.writeByte(inByte);
          this.i++;
          // rEEprom() nel firmware invia esattamente 100 byte (490-589): a differenza di
          // read.pde (che ne aspettava 104), qui ci fermiamo al limite reale del protocollo.
          if (this.i > 99) this.step = 4;
        } else if (this.mode === 'write') {
          if (inByte === this.dataVal[this.i]) {
            this.i++;
            this.cb.onWriteProgress?.(Math.min(this.i, this.totalRealValues));
            if (this.i < this.dataVal.length) {
              this.cb.writeBytes([-128, this.dataVal[this.i]]);
            } else {
              this.step = 5;
              this.cb.onWriteComplete(this.totalRealValues);
            }
          }
        }
        break;

      case 4:
        if (this.mode === 'read') {
          this.cb.onReadComplete(this.dumpValues);
        }
        this.step = 5;
        break;
    }
  }
}
