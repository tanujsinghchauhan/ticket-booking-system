import cron from 'node-cron';
import { WaitlistService } from '../modules/waitlist/waitlist.service.js';

export function initWaitlistOfferJob() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await WaitlistService.expireOffers();
    } catch (err) {
      console.error('[Waitlist Offer Job Error]:', err);
    }
  });
}
