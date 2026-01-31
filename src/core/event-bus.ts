/**
 * Event Bus for Inter-Feature Communication
 *
 * Allows features to communicate without direct dependencies.
 * Features can emit events and subscribe to events from other features.
 *
 * Usage in a feature:
 *   // In your feature's init():
 *   eventBus.on("player-scored", (data) => {
 *     console.log(`Player ${data.playerSlot} scored ${data.points} points`);
 *   });
 *
 *   // Somewhere else in your feature:
 *   eventBus.emit("player-scored", { playerSlot: 5, points: 100 });
 *
 * NOTE: Event handlers are cleared on hot reload. Re-subscribe in init().
 */

import type { Domain } from "cs_script/point_script";

/**
 * Generic event data type - features define their own event shapes
 */
export type EventData = Record<string, unknown>;

/**
 * Event handler callback type
 */
export type EventHandler<T extends EventData = EventData> = (data: T) => void;

/**
 * Subscription ID for unsubscribing
 */
export type SubscriptionId = number;

/**
 * Event Bus interface
 */
export interface EventBus {
  /**
   * Subscribe to an event
   * @param eventName - The event name to listen for
   * @param handler - Callback function when event is emitted
   * @returns Subscription ID for unsubscribing
   */
  on<T extends EventData = EventData>(eventName: string, handler: EventHandler<T>): SubscriptionId;

  /**
   * Subscribe to an event (one-time only)
   * Handler is automatically removed after first invocation
   * @param eventName - The event name to listen for
   * @param handler - Callback function when event is emitted
   * @returns Subscription ID for unsubscribing
   */
  once<T extends EventData = EventData>(eventName: string, handler: EventHandler<T>): SubscriptionId;

  /**
   * Unsubscribe from an event using subscription ID
   * @param subscriptionId - The ID returned from on() or once()
   */
  off(subscriptionId: SubscriptionId): void;

  /**
   * Emit an event to all subscribers
   * @param eventName - The event name to emit
   * @param data - Event data to pass to handlers
   */
  emit<T extends EventData = EventData>(eventName: string, data: T): void;

  /**
   * Remove all handlers for a specific event
   * @param eventName - The event name to clear
   */
  clear(eventName: string): void;

  /**
   * Remove ALL handlers for ALL events
   * Called automatically before hot reload
   */
  clearAll(): void;

  /**
   * Check if an event has any subscribers
   * @param eventName - The event name to check
   */
  hasSubscribers(eventName: string): boolean;

  /**
   * Get count of subscribers for an event
   * @param eventName - The event name to check
   */
  subscriberCount(eventName: string): number;
}

interface Subscription {
  id: SubscriptionId;
  eventName: string;
  handler: EventHandler;
  once: boolean;
}

/**
 * Create an event bus instance
 * @param instance - The PointScript Instance for logging
 * @param debug - Enable debug logging (default: false)
 */
export function createEventBus(instance: Domain, debug = false): EventBus {
  const subscriptions = new Map<string, Subscription[]>();
  let nextId = 1;

  function log(message: string): void {
    if (debug) {
      instance.Msg(`[EventBus] ${message}`);
    }
  }

  /**
   * Internal helper to create and register a subscription
   */
  function addSubscription<T extends EventData>(
    eventName: string,
    handler: EventHandler<T>,
    once: boolean
  ): SubscriptionId {
    const id = nextId++;
    const subscription: Subscription = {
      id,
      eventName,
      handler: handler as EventHandler,
      once,
    };

    let subs = subscriptions.get(eventName);
    if (!subs) {
      subs = [];
      subscriptions.set(eventName, subs);
    }
    subs.push(subscription);

    log(`Subscribed${once ? " (once)" : ""} to "${eventName}" (id: ${id})`);
    return id;
  }

  return {
    on<T extends EventData = EventData>(eventName: string, handler: EventHandler<T>): SubscriptionId {
      return addSubscription(eventName, handler, false);
    },

    once<T extends EventData = EventData>(eventName: string, handler: EventHandler<T>): SubscriptionId {
      return addSubscription(eventName, handler, true);
    },

    off(subscriptionId: SubscriptionId): void {
      for (const [eventName, subs] of subscriptions) {
        const index = subs.findIndex((s) => s.id === subscriptionId);
        if (index !== -1) {
          subs.splice(index, 1);
          log(`Unsubscribed from "${eventName}" (id: ${subscriptionId})`);
          if (subs.length === 0) {
            subscriptions.delete(eventName);
          }
          return;
        }
      }
    },

    emit<T extends EventData = EventData>(eventName: string, data: T): void {
      const subs = subscriptions.get(eventName);
      if (!subs || subs.length === 0) {
        log(`Emit "${eventName}" - no subscribers`);
        return;
      }

      log(`Emit "${eventName}" to ${subs.length} subscriber(s)`);

      // Process handlers, tracking which to remove (once handlers)
      const toRemove: SubscriptionId[] = [];

      for (const sub of subs) {
        try {
          sub.handler(data);
          if (sub.once) {
            toRemove.push(sub.id);
          }
        } catch (error) {
          instance.Msg(`[EventBus] ERROR in handler for "${eventName}": ${error}`);
        }
      }

      // Remove once handlers
      for (const id of toRemove) {
        this.off(id);
      }
    },

    clear(eventName: string): void {
      const count = subscriptions.get(eventName)?.length ?? 0;
      subscriptions.delete(eventName);
      log(`Cleared ${count} subscriber(s) for "${eventName}"`);
    },

    clearAll(): void {
      let totalCount = 0;
      for (const subs of subscriptions.values()) {
        totalCount += subs.length;
      }
      subscriptions.clear();
      nextId = 1;
      log(`Cleared all ${totalCount} subscription(s)`);
    },

    hasSubscribers(eventName: string): boolean {
      const subs = subscriptions.get(eventName);
      return subs !== undefined && subs.length > 0;
    },

    subscriberCount(eventName: string): number {
      return subscriptions.get(eventName)?.length ?? 0;
    },
  };
}

/**
 * Common event names that features might use
 * Features can define their own event names - these are just suggestions
 */
export const CommonEvents = {
  // Player-related events
  PLAYER_SCORED: "player:scored",
  PLAYER_STATE_CHANGED: "player:state-changed",

  // Game state events
  GAME_STATE_CHANGED: "game:state-changed",
  OBJECTIVE_COMPLETED: "game:objective-completed",

  // Feature coordination events
  FEATURE_READY: "feature:ready",
  FEATURE_ACTION: "feature:action",
} as const;
