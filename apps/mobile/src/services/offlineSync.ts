import { mobileApi } from '../api';

export interface OfflineAction {
  id: string;
  type: 'ADJUST_BROKEN' | 'COLLECT_PAYMENT';
  payload: any;
  timestamp: number;
}

const RUNS_CACHE_KEY = 'ovovita_cached_runs';
const QUEUE_KEY = 'ovovita_offline_actions';

export const offlineSync = {
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  cacheRuns(runs: any[]): void {
    try {
      localStorage.setItem(RUNS_CACHE_KEY, JSON.stringify(runs));
    } catch (err) {
      console.warn('Failed to cache driver runs:', err);
    }
  },

  getCachedRuns(): any[] {
    try {
      const data = localStorage.getItem(RUNS_CACHE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getQueue(): OfflineAction[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  queueAction(type: OfflineAction['type'], payload: any): OfflineAction {
    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
    };

    const queue = this.getQueue();
    queue.push(action);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Also optimistically update local cached run sheet
    const cachedRuns = this.getCachedRuns();
    if (type === 'COLLECT_PAYMENT') {
      const updated = cachedRuns.map((r) =>
        r._id === payload.orderId ? { ...r, status: 'DELIVERED', offlinePendingSync: true } : r
      );
      this.cacheRuns(updated);
    } else if (type === 'ADJUST_BROKEN') {
      const updated = cachedRuns.map((r) => {
        if (r._id === payload.orderId) {
          return {
            ...r,
            brokenEggsAdjusted: payload.brokenEggsCount,
            offlinePendingSync: true,
          };
        }
        return r;
      });
      this.cacheRuns(updated);
    }

    return action;
  },

  async flushQueue(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;
    const remaining: OfflineAction[] = [];

    for (const action of queue) {
      try {
        if (action.type === 'ADJUST_BROKEN') {
          await mobileApi.adjustBrokenEggs(action.payload);
        } else if (action.type === 'COLLECT_PAYMENT') {
          await mobileApi.collectPayment(action.payload);
        }
        synced++;
      } catch (err) {
        console.error(`Failed to sync offline action ${action.id}:`, err);
        failed++;
        remaining.push(action);
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return { synced, failed };
  },

  subscribe(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};
