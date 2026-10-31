import cron from 'node-cron';
import { runBillingJob } from './billing.service';

let cronTask: cron.ScheduledTask | null = null;

export function initBillingCron() {
  const schedule = process.env.BILLING_CRON_SCHEDULE || '0 0 * * *'; // Default midnight daily

  if (!cron.validate(schedule)) {
    console.warn(`[BILLING CRON] Invalid cron expression: "${schedule}". Falling back to daily midnight.`);
  }

  const validSchedule = cron.validate(schedule) ? schedule : '0 0 * * *';

  cronTask = cron.schedule(validSchedule, async () => {
    console.log(`[BILLING CRON] Starting scheduled billing cycle at ${new Date().toISOString()}...`);
    try {
      const summary = await runBillingJob(new Date());
      console.log(`[BILLING CRON] Completed: ${summary.invoicesGenerated} invoices generated, ${summary.skippedAlreadyBilled} skipped (idempotent), ${summary.errors.length} errors.`);
    } catch (err) {
      console.error('[BILLING CRON] Unhandled error during scheduled billing run:', err);
    }
  });

  console.log(`[BILLING CRON] Recurring billing scheduler activated with pattern: ${validSchedule}`);
}

export function stopBillingCron() {
  if (cronTask) {
    cronTask.stop();
    console.log('[BILLING CRON] Recurring billing scheduler stopped.');
  }
}
