import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { monthStartKey, todayKey } from '../../core/dates';
import { errorMessage } from '../../core/errors';
import { HouseService } from '../../core/house.service';
import { HouseStatRow, SellerStatRow, sellerTypeLabel } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { StatsService } from '../../core/stats.service';
import { DateRange } from '../../shared/date-range/date-range';

@Component({
  selector: 'app-stats',
  imports: [DateRange],
  templateUrl: './stats.html',
})
export class StatsPage {
  private readonly houses = inject(HouseService);
  private readonly stats = inject(StatsService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly from = signal(monthStartKey());
  protected readonly to = signal(todayKey());
  protected readonly sellerFilter = signal('');
  protected readonly houseRows = signal<HouseStatRow[]>([]);
  protected readonly sellerRows = signal<SellerStatRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  constructor() {
    this.seo.set({
      title: 'إحصائيات النقرات | ابني بيتك',
      description:
        'إحصائيات ابني بيتك: نقرات المنازل، إجمالي نقرات منازل كل بائع، ونقرات إظهار رقم الهاتف حسب تاريخ البداية والنهاية.',
      path: '/stats',
    });
    const profile = this.auth.profile();
    if (profile?.role === 'seller') this.sellerFilter.set(profile.uid);
    void this.reload();
  }

  protected setSeller(event: Event): void {
    this.sellerFilter.set((event.target as HTMLSelectElement).value);
  }

  protected visibleHouses(): HouseStatRow[] {
    const sellerId = this.sellerFilter();
    const rows = this.houseRows();
    return sellerId ? rows.filter((row) => row.house.sellerId === sellerId) : rows;
  }

  protected visibleSellers(): SellerStatRow[] {
    const sellerId = this.sellerFilter();
    const rows = this.sellerRows();
    return sellerId ? rows.filter((row) => row.sellerId === sellerId) : rows;
  }

  protected async reload(): Promise<void> {
    if (this.from() > this.to()) {
      this.error.set('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const houses = await this.houses.listPublished();
      const overview = await this.stats.overview(houses, this.from(), this.to());
      this.houseRows.set(overview.houses);
      this.sellerRows.set(overview.sellers);
    } catch (error) {
      this.houseRows.set([]);
      this.sellerRows.set([]);
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
