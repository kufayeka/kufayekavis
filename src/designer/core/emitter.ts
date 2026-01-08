export type Unsubscribe = () => void;

export class Emitter<TEvent extends string = string> {
  private listeners = new Map<TEvent, Set<() => void>>();

  on(event: TEvent, listener: () => void): Unsubscribe {
    const set = this.listeners.get(event) ?? new Set<() => void>();
    set.add(listener);
    this.listeners.set(event, set);
    return () => {
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(event);
    };
  }

  emit(event: TEvent): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of Array.from(set)) listener();
  }
}
