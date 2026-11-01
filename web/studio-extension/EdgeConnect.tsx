import { useState } from "react";
import { useSub } from "./usePubSub";
import { Usb, ArrowRight } from "lucide-react";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import type { AvailableDevice } from "./tauri/index";
export type TransportFactory = {
  label: string;
  isWireless?: boolean;
  connect?: () => Promise<RpcTransport>;
  pick_and_connect?: {
    list: () => Promise<Array<AvailableDevice>>;
    connect: (dev: AvailableDevice) => Promise<RpcTransport>;
  };
};
export interface ConnectModalProps {
  open?: boolean;
  transports: TransportFactory[];
  onTransportCreated: (t: RpcTransport) => void;
}
export function ConnectModal({
  open,
  transports,
  onTransportCreated,
}: ConnectModalProps) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [devices, setDevices] = useState<AvailableDevice[]>([]);
  useSub("edge.connection.error", setError);
  const transport = transports.find((t) => t.label === "USB");
  async function connect(device?: AvailableDevice) {
    if (!transport) return;
    setBusy(true);
    setError("");
    try {
      if (transport.connect) onTransportCreated(await transport.connect());
      else if (transport.pick_and_connect) {
        if (device)
          onTransportCreated(await transport.pick_and_connect.connect(device));
        else setDevices(await transport.pick_and_connect.list());
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.name !== "NotFoundError" &&
        !e.message.toLowerCase().includes("cancel")
      )
        setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <section className="edge-connect-banner">
      <div className="edge-connect-icon">
        <Usb size={22} />
      </div>
      <div>
        <p className="edge-eyebrow">ZMK STUDIO / USB</p>
        <h2>Connect your keyboard</h2>
        <p>USB required for keymap and layer editing.</p>
        {error && (
          <p role="alert" className="edge-inline-error">
            {error}
          </p>
        )}
        {!transport && (
          <p role="alert">
            Use a browser with Web Serial support, such as Chrome or Edge.
          </p>
        )}
        {devices.map((d) => (
          <button key={d.id} onClick={() => void connect(d)}>
            {d.label}
          </button>
        ))}
      </div>
      <button
        className="edge-button edge-button-primary"
        disabled={busy || !transport}
        onClick={() => void connect()}
      >
        {busy ? "Connecting…" : "Connect keyboard"}
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
