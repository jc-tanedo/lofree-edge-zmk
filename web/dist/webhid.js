import { buildReadRequest, parseReadResponse, buildTransactionRequest, buildKeymapRequest, validateReply, REPORT_ID } from './protocol.js';
import { validateDraft, verifyFactoryMap } from './keymap.js';

export const EDGE_FILTER = Object.freeze({ vendorId: 0x05ac, productId: 0x0256, usagePage: 0xff1c, usage: 0x92 });

export function isSupportedEdge(device) {
  const size = report => report.items.reduce((sum, item) => sum + item.reportSize * item.reportCount, 0);
  return device.vendorId === EDGE_FILTER.vendorId && device.productId === EDGE_FILTER.productId &&
    device.collections.some(collection => collection.usagePage === EDGE_FILTER.usagePage &&
      collection.usage === EDGE_FILTER.usage &&
      collection.inputReports.some(report => report.reportId === REPORT_ID && size(report) === 504) &&
      collection.outputReports.some(report => report.reportId === REPORT_ID && size(report) === 504));
}

export class EdgeConnection {
  #pending = null;
  #usable = true;
  #operation = false;
  #factory = null;

  constructor(device) {
    if (!isSupportedEdge(device)) throw new Error('This device does not expose the supported Edge configuration channel.');
    this.device = device;
  }

  static async request(hid) {
    if (!hid) throw new Error('WebHID is unavailable. Open this page in a compatible desktop browser.');
    const granted = (await hid.getDevices?.() ?? []).filter(isSupportedEdge);
    const devices = granted.length === 1 ? granted :
      (await hid.requestDevice({ filters: [EDGE_FILTER] })).filter(isSupportedEdge);
    if (devices.length !== 1) throw new Error('Select one Lofree Edge configuration interface.');
    const connection = new EdgeConnection(devices[0]);
    if (!connection.device.opened) await connection.device.open();
    return connection;
  }

  async close() {
    this.#usable = false;
    this.#pending?.(new Error('Keyboard disconnected. Connect again to continue.'));
    if (this.device.opened) await this.device.close();
  }

  async #exclusive(operation) {
    if (this.#operation) throw new Error('A keyboard operation is already in progress.');
    this.#operation = true;
    try { return await operation(); } finally { this.#operation = false; }
  }

  async #read(command, offset, length, timeout = 1500) {
    const exchange = await this.#exchange(buildReadRequest(offset, length, command), timeout);
    return { ...exchange, data: parseReadResponse(exchange.response, offset, length, command) };
  }

  async read(offset, length, timeout = 1500) {
    return this.#exclusive(() => this.#read(5, offset, length, timeout));
  }

  async loadKeymap() {
    return this.#exclusive(async () => {
      const capability = (await this.#read(3, 0, 34)).data;
      if (capability[5] !== 128 || (await this.#read(5, 0, 1)).data[0] !== 0) throw new Error('Only the verified 128-slot, profile-zero Edge is supported.');
      const factory = new Uint8Array(384);
      for (let offset = 0; offset < 384; offset += 56) factory.set((await this.#read(7, offset, Math.min(56, 384-offset))).data, offset);
      verifyFactoryMap(factory);
      this.#factory = factory.slice();
      const current = new Uint8Array(384);
      for (let offset = 0; offset < 384; offset += 56) current.set((await this.#read(8, offset, Math.min(56, 384-offset))).data, offset);
      validateDraft(current);
      return current;
    });
  }

  async verifyForFirmwareUpdate() {
    return this.#exclusive(async () => {
      if (this.device.productName !== 'EDGE84@Lofree') throw new Error('Firmware updates require the verified Edge stock firmware.');
      // The obsolete GPIO probe shares the stock USB identity. Refuse it explicitly.
      const table = (await this.#read(0x1b, 0, 16)).data;
      const expected = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,44,15];
      if (table.some((byte, index) => byte !== expected[index])) throw new Error('Stock firmware verification failed. No update was started.');
      const reports = this.device.collections.flatMap(collection => collection.outputReports);
      const size = report => report.items.reduce((sum, item) => sum + item.reportSize * item.reportCount, 0);
      if (!reports.some(report => report.reportId === 5 && size(report) === 256) ||
          !this.device.collections.flatMap(collection => collection.inputReports).some(report => report.reportId === 5 && size(report) === 256)) {
        throw new Error('The verified 32-byte firmware channel is unavailable.');
      }
    });
  }

  async applyKeymap(draft, onProgress = () => {}) {
    validateDraft(draft);
    const map = draft.slice();
    return this.#exclusive(async () => {
      if (!this.#factory) throw new Error('Load and verify the key layout before applying a keymap.');
      if ((await this.#read(5, 0, 1)).data[0] !== 0) throw new Error('The keyboard profile changed. Reconnect and load the layout again.');
      try {
        await this.#exchange(buildTransactionRequest());
        for (let offset = 0; offset < 384; offset += 56) {
          await this.#exchange(buildKeymapRequest(offset, map.slice(offset, offset + 56)));
          onProgress(Math.min(offset + 56, 384), 384);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        await this.#exchange(buildTransactionRequest(true));
      } catch (error) {
        throw new Error(`Keymap apply was interrupted: ${error.message} Reconnect, load the layout, and use Restore defaults to recover.`);
      }
      return map;
    });
  }

  async #exchange(request, timeout = 1500) {
    if (!this.#usable || !this.device.opened) throw new Error('Connect the keyboard first.');
    if (this.#pending) throw new Error('A keyboard request is already in progress.');
    if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 5000) throw new RangeError('Invalid response timeout.');
    let response;
    try {
      response = await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error, packet) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.device.removeEventListener('inputreport', onReport);
          this.#pending = null;
          if (error) reject(error); else resolve(packet);
        };
        const onReport = event => {
          if (event.reportId !== REPORT_ID || event.device !== this.device) return;
          const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
          if (data.length !== 63 || data[2] !== request[3]) return;
          const packet = new Uint8Array(64);
          packet[0] = REPORT_ID;
          packet.set(data, 1);
          // Ignore unrelated replies. A bounded timeout handles a missing match.
          if ([1, 2, 3, 4, 5, 6].some(index => packet[index] !== request[index])) return;
          finish(null, packet);
        };
        const timer = setTimeout(() => finish(new Error('The keyboard did not reply. Reconnect and try again.')), timeout);
        this.#pending = error => finish(error);
        this.device.addEventListener('inputreport', onReport);
        // WebHID carries the report ID separately: send precisely 63 payload bytes.
        this.device.sendReport(REPORT_ID, request.slice(1)).catch(error => finish(error));
      });
      validateReply(response, request);
      return { request, response };
    } catch (error) {
      // A late reply must not satisfy a subsequent identical request.
      try { await this.close(); } catch { /* Preserve the original request error. */ }
      throw error;
    }
  }
}
