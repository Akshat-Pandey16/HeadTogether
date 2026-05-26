import { env } from "./env";
import { WsEvent } from "@/types";

export type WsMessage = { type: string; data?: Record<string, unknown> };

type Listener = (msg: WsMessage) => void;
type StatusListener = (status: WsStatus) => void;
export type WsStatus = "connecting" | "open" | "closed" | "reconnecting";

type SocketOptions = {
  path: string;
  token: string;
  query?: Record<string, string | null | undefined>;
  onMessage?: Listener;
  onStatus?: StatusListener;
  reconnect?: boolean;
};

const STRICT_MODE_GRACE_MS = 60;

export class WsSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private status: WsStatus = "closed";
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private manuallyClosed = false;

  constructor(private readonly opts: SocketOptions) {
    if (opts.onMessage) this.listeners.add(opts.onMessage);
    if (opts.onStatus) this.statusListeners.add(opts.onStatus);
  }

  connect() {
    this.manuallyClosed = false;
    this.setStatus(this.retries === 0 ? "connecting" : "reconnecting");
    if (this.openTimer) clearTimeout(this.openTimer);
    this.openTimer = setTimeout(() => {
      this.openTimer = null;
      this.openSocket();
    }, STRICT_MODE_GRACE_MS);
  }

  private openSocket() {
    if (this.manuallyClosed) return;
    const url = this.buildUrl();
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.retries = 0;
      this.setStatus("open");
      this.startHeartbeat();
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as WsMessage;
        if (msg.type === WsEvent.PING) {
          this.send({ type: WsEvent.PONG });
          return;
        }
        for (const fn of this.listeners) fn(msg);
      } catch {
        // ignore malformed
      }
    };
    ws.onerror = () => {
      // close handler runs next
    };
    ws.onclose = () => {
      this.stopHeartbeat();
      this.setStatus("closed");
      if (!this.manuallyClosed && this.opts.reconnect !== false) {
        this.scheduleReconnect();
      }
    };
  }

  close() {
    this.manuallyClosed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.openTimer) {
      clearTimeout(this.openTimer);
      this.openTimer = null;
    }
    this.stopHeartbeat();
    const ws = this.ws;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close();
        } catch {
          // ignore
        }
      }
    }
    this.ws = null;
    this.setStatus("closed");
  }

  send(payload: WsMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  updateQuery(query: Record<string, string | null | undefined>) {
    this.opts.query = { ...this.opts.query, ...query };
  }

  private setStatus(s: WsStatus) {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }

  private scheduleReconnect() {
    this.retries += 1;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(this.retries, 5));
    this.retryTimer = setTimeout(() => this.openSocket(), delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: WsEvent.PONG });
    }, 25_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private buildUrl(): string {
    const base = env.wsBaseUrl.replace(/\/$/, "");
    const target = `${base}${this.opts.path}`;
    const absolute = /^wss?:\/\//.test(target)
      ? target
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${target}`;
    const url = new URL(absolute);
    url.searchParams.set("token", this.opts.token);
    if (this.opts.query) {
      for (const [k, v] of Object.entries(this.opts.query)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    return url.toString();
  }
}
