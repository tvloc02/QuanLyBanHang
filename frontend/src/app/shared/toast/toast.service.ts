import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  show(type: ToastType, message: string, durationMs = 2500): void {
    const id = this.nextId++;
    const toast: Toast = { id, type, message };

    this.toasts.update((list) => [...list, toast]);

    window.setTimeout(() => {
      this.dismiss(id);
    }, durationMs);
  }

  success(message: string, durationMs?: number): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs?: number): void {
    this.show('error', message, durationMs);
  }

  info(message: string, durationMs?: number): void {
    this.show('info', message, durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
