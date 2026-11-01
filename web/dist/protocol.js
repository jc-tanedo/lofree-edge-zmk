// Wire format corroborated with physical Edge replies; see docs/protocol.md.
export const REPORT_ID = 4;
export const READ_COMMAND = 5;
export const MAX_PAYLOAD = 56;

export function buildReadRequest(offset, length, command = READ_COMMAND) {
  if (![3, 5, 7, 8, 0x1b].includes(command)) throw new RangeError('Unsupported read command.');
  if (!Number.isInteger(offset) || offset < 0 || offset > 0xffff ||
      !Number.isInteger(length) || length < 1 || length > MAX_PAYLOAD || offset + length > 0x10000) {
    throw new RangeError('Read must contain 1–56 bytes within the 16-bit address range.');
  }
  const packet = new Uint8Array(64);
  packet[0] = REPORT_ID;
  packet[3] = command;
  packet[4] = length;
  packet[5] = offset & 255;
  packet[6] = offset >>> 8;
  const checksum = packet.slice(3).reduce((sum, byte) => sum + byte, 0);
  packet[1] = checksum & 255;
  packet[2] = checksum >>> 8;
  return packet;
}

export function validateReply(packet, request) {
  if (!(packet instanceof Uint8Array) || packet.length !== 64) throw new Error('Expected a 64-byte response.');
  for (const index of [0, 1, 2, 3, 4, 5, 6]) {
    if (packet[index] !== request[index]) throw new Error('Response does not match the read request.');
  }
  if (packet[7] !== 0) throw new Error(`Keyboard returned status 0x${packet[7].toString(16).padStart(2, '0')}.`);
  // Reply echoes the request checksum. It does not checksum the returned data.
}

export function parseReadResponse(packet, offset, length, command = READ_COMMAND) {
  const request = buildReadRequest(offset, length, command);
  validateReply(packet, request);
  return packet.slice(8, 8 + length);
}

export function buildTransactionRequest(finish = false) {
  const packet = new Uint8Array(64);
  packet[0] = REPORT_ID;
  packet[3] = finish ? 2 : 1;
  packet[1] = packet[3];
  return packet;
}

export function buildKeymapRequest(offset, data) {
  if (!(data instanceof Uint8Array) || offset + data.length > 384) throw new RangeError('Keymap must stay within384 bytes.');
  const packet = buildReadRequest(offset, data.length);
  packet[3] = 9;
  packet.set(data, 8);
  const sum = packet.slice(3).reduce((a, b) => a + b, 0);
  packet[1] = sum & 255;
  packet[2] = sum >>> 8;
  return packet;
}

export function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
