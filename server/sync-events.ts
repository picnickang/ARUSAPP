import { EventEmitter } from "node:events";
import { count, sql, eq, and, gt } from "drizzle-orm";
import { db } from "./db.js";
import { syncJournal, syncOutbox } from "../shared/schema.js";
import type { InsertSyncJournal, InsertSyncOutbox } from "../shared/schema.js";

// Internal event bus for real-time notifications
export const syncEventBus = new EventEmitter();

// Set max listeners to prevent warnings in high-activity scenarios
syncEventBus.setMaxListeners(100);

// Entity types that can be tracked
export type EntityType = 
  | "vessel" | "crew" | "sensor" | "part" | "stock" 
  | "supplier" | "substitution" | "work_order" | "schedule" 
  | "rest_log" | "parts_inventory" | "equipment" | "sync";

// Operation types for journal entries
export type OperationType = "create" | "update" | "delete" | "reconcile";

// Event types for outbox - comprehensive coverage for all entity types
export type EventType = 
  | "part.created" | "part.updated" | "part.deleted"
  | "stock.created" | "stock.updated" | "stock.deleted"
  | "work_order.created" | "work_order.updated" | "work_order.deleted"
  | "crew.created" | "crew.updated" | "crew.deleted"
  | "vessel.created" | "vessel.updated" | "vessel.deleted"
  | "supplier.created" | "supplier.updated" | "supplier.deleted"
  | "sensor.created" | "sensor.updated" | "sensor.deleted"
  | "substitution.created" | "substitution.updated" | "substitution.deleted"
  | "schedule.created" | "schedule.updated" | "schedule.deleted"
  | "rest_log.created" | "rest_log.updated" | "rest_log.deleted"
  | "parts_inventory.created" | "parts_inventory.updated" | "parts_inventory.deleted"
  | "equipment.created" | "equipment.updated" | "equipment.deleted"
  | "sync.reconciled" | "cost.synced" | "reconcile.completed" | "inventory.optimized";

/**
 * Record an operation in the sync journal for audit trails
 */
export async function recordJournalEntry(
  entityType: EntityType,
  entityId: string,
  operation: OperationType,
  payload: any,
  userId?: string
): Promise<void> {
  try {
    const journalEntry: InsertSyncJournal = {
      entityType,
      entityId,
      operation,
      payload: payload || {},
      userId,
    };

    await db.insert(syncJournal).values(journalEntry);
  } catch (error) {
    console.error(`[SyncEvents] Failed to record journal entry:`, error);
    // Don't throw - journaling should not break main operations
  }
}

/**
 * Publish an event to the outbox for real-time notifications
 */
export async function publishEvent(
  eventType: EventType,
  payload: any,
  emitRealtime: boolean = true
): Promise<void> {
  try {
    const outboxEntry: InsertSyncOutbox = {
      eventType,
      payload: payload || {},
      processed: false,
      processingAttempts: 0,
    };

    await db.insert(syncOutbox).values(outboxEntry);

    // Emit real-time event if requested
    if (emitRealtime) {
      syncEventBus.emit(eventType, payload);
    }
  } catch (error) {
    console.error(`[SyncEvents] Failed to publish event:`, error);
    // Don't throw - event publishing should not break main operations
  }
}

/**
 * Helper function to record both journal and event for common operations
 */
export async function recordAndPublish(
  entityType: EntityType,
  entityId: string,
  operation: OperationType,
  data: any,
  userId?: string
): Promise<void> {
  // Record in journal
  await recordJournalEntry(entityType, entityId, operation, data, userId);

  // Determine event type based on operation and entity type
  let eventType: EventType;
  if (entityType === 'sync' && operation === 'reconcile') {
    eventType = 'sync.reconciled';
  } else {
    // Map operation to correct event suffix
    const eventSuffix = operation === 'create' ? 'created' 
                      : operation === 'update' ? 'updated'
                      : operation === 'delete' ? 'deleted'
                      : 'updated'; // fallback
    eventType = `${entityType}.${eventSuffix}` as EventType;
  }
  
  await publishEvent(eventType, { id: entityId, data, operation });
}

/**
 * Get recent journal entries for an entity
 */
export async function getEntityHistory(
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const entries = await db
      .select()
      .from(syncJournal)
      .where(and(eq(syncJournal.entityType, entityType), eq(syncJournal.entityId, entityId)))
      .orderBy(syncJournal.createdAt)
      .limit(limit);

    return entries;
  } catch (error) {
    console.error(`[SyncEvents] Failed to get entity history:`, error);
    return [];
  }
}

/**
 * Process pending outbox events (for batch processing)
 */
export async function processPendingEvents(limit: number = 100): Promise<number> {
  try {
    const pendingEvents = await db
      .select()
      .from(syncOutbox)
      .where(eq(syncOutbox.processed, false))
      .orderBy(syncOutbox.createdAt)
      .limit(limit);

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        // Emit the event
        syncEventBus.emit(event.eventType, event.payload);

        // Mark as processed
        await db
          .update(syncOutbox)
          .set({ 
            processed: true, 
            processedAt: new Date(),
            processingAttempts: event.processingAttempts + 1 
          })
          .where(eq(syncOutbox.id, event.id));

        processedCount++;
      } catch (eventError) {
        console.error(`[SyncEvents] Failed to process event ${event.id}:`, eventError);
        
        // Increment processing attempts
        await db
          .update(syncOutbox)
          .set({ processingAttempts: event.processingAttempts + 1 })
          .where(eq(syncOutbox.id, event.id));
      }
    }

    return processedCount;
  } catch (error) {
    console.error(`[SyncEvents] Failed to process pending events:`, error);
    return 0;
  }
}

/**
 * Get sync system health metrics
 */
export async function getSyncMetrics(): Promise<{
  totalJournalEntries: number;
  pendingEvents: number;
  failedEvents: number;
  recentActivity: number;
}> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [totalJournal, pendingEvents, failedEvents, recentActivity] = await Promise.all([
      db.select({ count: count() }).from(syncJournal),
      db.select({ count: count() }).from(syncOutbox).where(eq(syncOutbox.processed, false)),
      db.select({ count: count() }).from(syncOutbox).where(gt(syncOutbox.processingAttempts, 3)),
      db.select({ count: count() }).from(syncJournal).where(gt(syncJournal.createdAt, twentyFourHoursAgo)),
    ]);

    return {
      totalJournalEntries: Number(totalJournal[0]?.count || 0),
      pendingEvents: Number(pendingEvents[0]?.count || 0),
      failedEvents: Number(failedEvents[0]?.count || 0),
      recentActivity: Number(recentActivity[0]?.count || 0),
    };
  } catch (error) {
    console.error(`[SyncEvents] Failed to get sync metrics:`, error);
    return {
      totalJournalEntries: 0,
      pendingEvents: 0,
      failedEvents: 0,
      recentActivity: 0,
    };
  }
}