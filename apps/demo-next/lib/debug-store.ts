export type DebugEvent = {
  id: string;
  kind: "checkout" | "forward" | "log";
  timestamp: string;
  title: string;
  payload?: unknown;
};

type DebugStore = {
  events: DebugEvent[];
};

declare global {
  var __creemDataFastDebugStore__: DebugStore | undefined;
}

function getStore(): DebugStore {
  globalThis.__creemDataFastDebugStore__ ??= { events: [] };
  return globalThis.__creemDataFastDebugStore__;
}

export function pushDebugEvent(event: Omit<DebugEvent, "id" | "timestamp">): void {
  const store = getStore();
  store.events.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  });
  store.events = store.events.slice(0, 20);
}

export function listDebugEvents(): DebugEvent[] {
  return getStore().events;
}
