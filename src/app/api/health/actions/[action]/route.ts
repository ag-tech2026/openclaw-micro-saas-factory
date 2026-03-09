import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth-utils';
import { db } from '@/db';
import { healthAuditLog, maintenanceMode as maintenanceModeTable, healthAlerts } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm/expressions';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * POST /api/health/actions/:action
 *
 * Execute admin actions for health management.
 * Requires admin authentication with 2FA.
 *
 * Supported actions:
 * - restart-gateway
 * - clear-cache
 * - trigger-check
 * - toggle-maintenance (enable/disable)
 * - resolve-alert
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    // Require full admin auth with 2FA
    await requireAdmin(request);
    const user = await getCurrentUser(request);

    const { action } = await params;
    const body = await request.json().catch(() => ({}));
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let result: any = {};
    let success = true;
    let errorMessage: string | undefined;

    // Audit log entry
    const auditEntry = {
      timestamp: new Date(),
      userId: user?.id,
      action,
      resource: `health:${action}`,
      details: body,
      ipAddress: ip,
      userAgent,
      success: true,
    };

    try {
      switch (action) {
        case 'restart-gateway': {
          // Restart OpenClaw gateway service
          await execAsync('openclaw gateway restart', { timeout: 30000 });
          result = { message: 'Gateway restart initiated' };
          break;
        }

        case 'clear-cache': {
          // Clear Redis cache
          const cacheKey = body.key; // optional specific key
          if (cacheKey) {
            // Delete specific key - would need Redis client
            // For now, just log
            result = { message: `Cache key deletion not implemented: ${cacheKey}` };
          } else {
            // Flush entire Redis DB
            // We should use our Redis client, not shell command
            // For safety, we'll require explicit confirmation
            if (body.confirm !== 'FLUSH_ALL_CACHE') {
              return NextResponse.json(
                { error: 'Cache flush requires confirmation. Set confirm="FLUSH_ALL_CACHE" in request body.' },
                { status: 400 }
              );
            }
            // Ideally we'd call redisClient.flushdb()
            // For now, placeholder
            result = { message: 'Cache flush initiated (not implemented)' };
          }
          break;
        }

        case 'trigger-check': {
          // Trigger immediate health check via Inngest event
          const inngestUrl = process.env.INNGEST_SIGNING_KEY
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/inngest`
            : null;

          if (!inngestUrl) {
            throw new Error('Inngest not configured');
          }

          const triggerResponse = await fetch(inngestUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'manual/health.check',
              data: { userId: user?.id, timestamp: new Date().toISOString() },
            }),
          });

          if (!triggerResponse.ok) {
            throw new Error(`Inngest trigger failed: ${triggerResponse.status}`);
          }

          result = { message: 'Manual health check triggered' };
          break;
        }

        case 'toggle-maintenance': {
          // Enable or disable maintenance mode
          const enabled = body.enabled;
          const reason = body.reason || (enabled ? 'Manual maintenance' : undefined);

          if (typeof enabled !== 'boolean') {
            return NextResponse.json(
              { error: 'enabled (boolean) is required in request body' },
              { status: 400 }
            );
          }

          // Update maintenance_mode table
          const [existing] = await db
            .select()
            .from(maintenanceModeTable)
            .where(eq(maintenanceModeTable.id, 1))
            .limit(1);

          const now = new Date();
          if (existing) {
            await db
              .update(maintenanceModeTable)
              .set({
                enabled,
                reason,
                startedBy: enabled ? (existing.startedBy || user?.id) : user?.id,
                startedAt: enabled ? (existing.startedAt || now) : existing.startedAt,
                endedAt: !enabled ? now : undefined,
                endedBy: !enabled ? user?.id : undefined,
                updatedAt: now,
              })
              .where(eq(maintenanceModeTable.id, 1));
          } else {
            await db.insert(maintenanceModeTable).values({
              id: 1,
              enabled,
              reason,
              startedBy: enabled ? user?.id : undefined,
              startedAt: enabled ? now : undefined,
              endedAt: !enabled ? now : undefined,
              endedBy: !enabled ? user?.id : undefined,
            });
          }

          result = {
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
            enabled,
            reason,
          };
          break;
        }

        case 'resolve-alert': {
          // Mark an alert as resolved
          const alertId = body.alertId;
          if (!alertId) {
            return NextResponse.json(
              { error: 'alertId is required' },
              { status: 400 }
            );
          }

          const now = new Date();
          const [updated] = await db
            .update(healthAlerts)
            .set({
              resolved: true,
              resolvedAt: now,
              resolvedBy: user?.id,
            })
            .where(eq(healthAlerts.id, alertId))
            .returning()
            .limit(1);

          if (!updated) {
            return NextResponse.json(
              { error: 'Alert not found' },
              { status: 404 }
            );
          }

          result = { message: 'Alert resolved', alertId };
          break;
        }

        default:
          return NextResponse.json(
            { error: `Unknown action: ${action}. Supported: restart-gateway, clear-cache, trigger-check, toggle-maintenance, resolve-alert` },
            { status: 400 }
          );
      }

      // Record successful audit log
      auditEntry.details = { ...auditEntry.details, result };
      await db.insert(healthAuditLog).values(auditEntry);

      return NextResponse.json({
        success: true,
        action,
        ...result,
      });

    } catch (err: any) {
      errorMessage = err.message;
      success = false;

      // Record failed audit log
      auditEntry.success = false;
      auditEntry.errorMessage = err.message;
      try {
        await db.insert(healthAuditLog).values(auditEntry);
      } catch {
        // Ignore audit logging errors
      }

      return NextResponse.json(
        { error: `Action failed: ${action}`, message: err.message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error(`Health action ${params.action} error:`, error);
    return NextResponse.json(
      { error: 'Action failed', message: error.message },
      { status: 500 }
    );
  }
}
