// Mappa indirizzi EEPROM ricavata da pilotino_20260224.ino (rEEprom/wEEprom, dynamic(), configuration()).
// index = posizione nel backup (0-99); address = 490 + index (GYRO_DRIFT_ADR e' l'origine usata dal firmware).
// editable=true solo per i campi scritti tramite parWrite() (inserimento diretto di un numero da menu seriale).
// Tutti gli altri byte restano di sola lettura in UI ma vengono comunque ritrasmessi invariati in scrittura,
// perche' il protocollo seriale invia sempre l'intera sequenza di 100 byte.

export type ParamGroup = 'calibration' | 'dynamic' | 'config' | 'unknown';

export interface EepromParam {
  index: number;
  address: number;
  key: string;
  label: string;
  editable: boolean;
  group: ParamGroup;
  note?: string;
}

function calibrationBlock(startIndex: number, key: string, length: number): EepromParam[] {
  return Array.from({ length }, (_, offset) => ({
    index: startIndex + offset,
    address: 490 + startIndex + offset,
    key: length > 1 ? `${key}[${offset}]` : key,
    label: length > 1 ? `${key}[${offset}]` : key,
    editable: false,
    group: 'calibration' as const,
  }));
}

function unknownBlock(startIndex: number, endIndexInclusive: number): EepromParam[] {
  const out: EepromParam[] = [];
  for (let index = startIndex; index <= endIndexInclusive; index++) {
    out.push({
      index,
      address: 490 + index,
      key: `UNKNOWN_${490 + index}`,
      label: '—',
      editable: false,
      group: 'unknown',
    });
  }
  return out;
}

const EDITABLE_PARAMS: EepromParam[] = [
  { index: 52, address: 542, key: 'PITOT_KP', label: 'pitG', editable: true, group: 'dynamic' },
  { index: 53, address: 543, key: 'PITCH_DUMP', label: 'yDmp', editable: true, group: 'dynamic' },
  { index: 54, address: 544, key: 'ROLL_DUMP', label: 'xDmp', editable: true, group: 'dynamic' },
  { index: 55, address: 545, key: 'YAW_DUMP', label: 'zDmp', editable: true, group: 'dynamic' },
  { index: 56, address: 546, key: 'WING_LOAD', label: 'wl', editable: true, group: 'config' },
  { index: 57, address: 547, key: 'T_BOOM_LENGTH', label: 'tl', editable: true, group: 'config' },
  { index: 58, address: 548, key: 'CL_MAX', label: 'clMax', editable: true, group: 'dynamic' },
  { index: 59, address: 549, key: 'PITOT_FILTER', label: 'pitF', editable: true, group: 'dynamic' },
  { index: 60, address: 550, key: 'ROLL_TAU', label: 'tau', editable: true, group: 'dynamic' },
  { index: 61, address: 551, key: 'WINGSPAN', label: 'ws', editable: true, group: 'config' },
  { index: 62, address: 552, key: 'HEADING_GAIN', label: 'HdG', editable: true, group: 'dynamic' },
  { index: 63, address: 553, key: 'HEADING_DUMP', label: 'HdD', editable: true, group: 'dynamic' },
  { index: 64, address: 554, key: 'VARIO_TRIGGER', label: 'varTrgKts', editable: true, group: 'dynamic' },
  { index: 65, address: 555, key: 'PITOT_KD', label: 'pitD', editable: true, group: 'dynamic' },
  { index: 66, address: 556, key: 'THRUST_COMP', label: 'thrustComp', editable: true, group: 'dynamic' },
  { index: 67, address: 557, key: 'MOTOR_KP', label: 'motG', editable: true, group: 'dynamic' },
];

const UNCONFIRMED_CONFIG_PARAMS: EepromParam[] = [
  {
    index: 70,
    address: 560,
    key: 'CONF_FLAGS',
    label: 'confFlags',
    editable: false,
    group: 'config',
    note: 'Bitmask (Failsafe/thrAuto/elevons/flaperons/antispin) — richiede UI a checkbox, non number-textbox.',
  },
  {
    index: 71,
    address: 561,
    key: 'SERVO_REVERSE',
    label: 'srvRev',
    editable: false,
    group: 'config',
    note: 'Scritto da servoReverse(), non definita in pilotino_20260224.ino — verificare prima di abilitare.',
  },
  ...calibrationBlock(72, 'OUT_CONF', 4).map(p => ({
    ...p,
    label: `srvMap${p.key.slice(-2)}`,
    note: 'Scritto da channelMap(), non definita in pilotino_20260224.ino — verificare prima di abilitare.',
  })),
];

export const EEPROM_PARAMETER_MAP: EepromParam[] = [
  ...calibrationBlock(0, 'GYRO_DRIFT', 6),
  ...calibrationBlock(6, 'DTEMP_DRIFT', 2),
  ...calibrationBlock(8, 'TEMP_ZERO', 2), // EEPROM_read16: 2 byte reali, non 1 come da commento nel .ino
  ...calibrationBlock(10, 'ACC_MAX', 6),
  ...calibrationBlock(16, 'ACC_MIN', 6),
  ...calibrationBlock(22, 'ACC_ZERO', 6),
  ...calibrationBlock(28, 'ROLL_ZERO', 1),
  ...calibrationBlock(29, 'PITCH_ZERO', 1),
  ...calibrationBlock(30, 'FAIL_SAFE', 12),
  ...calibrationBlock(42, 'PITOT_ZERO', 2),
  ...calibrationBlock(44, 'GYRO_ZERO', 6),
  ...calibrationBlock(50, 'BARO_GROUND', 2),
  ...EDITABLE_PARAMS,
  ...unknownBlock(68, 69),
  ...UNCONFIRMED_CONFIG_PARAMS,
  ...unknownBlock(76, 99),
].sort((a, b) => a.index - b.index);

export function getParam(index: number): EepromParam | undefined {
  return EEPROM_PARAMETER_MAP.find(p => p.index === index);
}

export function isEditable(index: number): boolean {
  return getParam(index)?.editable ?? false;
}

export const EDITABLE_INDICES: number[] = EEPROM_PARAMETER_MAP.filter(p => p.editable).map(p => p.index);
