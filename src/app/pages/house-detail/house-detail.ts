import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/auth.service';
import { monthStartKey, todayKey, formatArabicDate } from '../../core/dates';
import { errorMessage } from '../../core/errors';
import { HouseService } from '../../core/house.service';
import { House, RangeTotals, sellerTypeLabel } from '../../core/models';
import { formatPrice } from '../../core/price';
import { SeoService } from '../../core/seo.service';
import { StatsService } from '../../core/stats.service';
import { youtubeVideoId } from '../../core/youtube';
import { DateRange } from '../../shared/date-range/date-range';
import { HouseCard } from '../../shared/house-card/house-card';
import { Stars } from '../../shared/stars/stars';

@Component({
  selector: 'app-house-detail',
  imports: [RouterLink, DateRange, HouseCard, Stars],
  templateUrl: './house-detail.html',
})
export class HouseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly houses = inject(HouseService);
  private readonly stats = inject(StatsService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly formatPrice = formatPrice;
  protected readonly formatArabicDate = formatArabicDate;
  protected readonly isAdmin = () => this.auth.profile()?.role === 'admin';
  protected isOwner(house: House): boolean {
    return this.auth.profile()?.uid === house.sellerId;
  }

  protected youtubeId(url: string): string | null {
    return youtubeVideoId(url);
  }

  protected youtubeEmbed(id: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}`);
  }
  protected readonly house = signal<House | null>(null);
  protected readonly related = signal<House[]>([]);
  protected readonly houseStats = signal<RangeTotals>({ views: 0, phoneReveals: 0 });
  protected readonly sellerStats = signal<RangeTotals>({ views: 0, phoneReveals: 0 });
  protected readonly from = signal(monthStartKey());
  protected readonly to = signal(todayKey());
  protected readonly photoIndex = signal(0);
  protected readonly phoneVisible = signal(false);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly error = signal('');
  protected readonly statsError = signal('');

  private requestId = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id) void this.openHouse(id);
    });
  }

  protected selectPhoto(index: number): void {
    this.photoIndex.set(index);
  }

  protected async revealPhone(): Promise<void> {
    const house = this.house();
    if (!house || this.phoneVisible()) return;
    this.phoneVisible.set(true);
    try {
      await this.stats.record(house.id, 'phone');
      this.house.update((current) => (current ? { ...current, phoneRevealCount: current.phoneRevealCount + 1 } : current));
      if (this.isAdmin()) await this.loadStats(house);
    } catch (error) {
      this.statsError.set(errorMessage(error));
    }
  }

  protected async applyStats(): Promise<void> {
    const house = this.house();
    if (!house) return;
    if (this.from() > this.to()) {
      this.statsError.set('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
      return;
    }
    this.statsError.set('');
    try {
      await this.loadStats(house);
    } catch (error) {
      this.statsError.set(errorMessage(error));
    }
  }

  private async openHouse(id: string): Promise<void> {
    const requestId = ++this.requestId;
    this.loading.set(true);
    this.missing.set(false);
    this.error.set('');
    this.statsError.set('');
    this.phoneVisible.set(false);
    this.photoIndex.set(0);
    this.related.set([]);
    try {
      const house = await this.houses.getById(id);
      if (requestId !== this.requestId) return;
      if (!house) {
        this.house.set(null);
        this.missing.set(true);
        this.seo.set({
          title: 'المنزل غير موجود | ابني بيتك',
          description: 'لم يتم العثور على هذا المنزل في ابني بيتك.',
          path: `/houses/${encodeURIComponent(id)}`,
        });
        return;
      }
      this.house.set(house);
      this.seo.set({
        title: `${house.name} | المنطقة ${house.region} القطاع ${house.sector}`,
        description: `${house.description} للبيع أو العرض عبر ابني بيتك. المنطقة ${house.region}، القطاع ${house.sector}، رقم المنزل ${house.houseNumber}. البائع ${house.sellerName}.`,
        path: `/houses/${encodeURIComponent(house.id)}`,
      });
      try {
        await this.stats.record(house.id, 'views');
        if (requestId !== this.requestId) return;
        this.house.update((current) => (current ? { ...current, viewCount: current.viewCount + 1 } : current));
      } catch (error) {
        if (requestId === this.requestId) this.statsError.set(errorMessage(error));
      }
      try {
        await this.auth.ensureReady();
        const related = await this.houses.bySeller(house.sellerId, house.id);
        if (requestId !== this.requestId) return;
        this.related.set(related);
        if (this.isAdmin()) await this.loadStats(house);
      } catch (error) {
        if (requestId === this.requestId) this.statsError.set(errorMessage(error));
      }
    } catch (error) {
      if (requestId !== this.requestId) return;
      this.house.set(null);
      this.error.set(errorMessage(error));
    } finally {
      if (requestId === this.requestId) this.loading.set(false);
    }
  }

  private async loadStats(house: House): Promise<void> {
    const [houseStats, sellerStats] = await Promise.all([
      this.stats.houseTotals(house.id, this.from(), this.to()),
      this.stats.sellerTotals(house.sellerId, this.from(), this.to()),
    ]);
    this.houseStats.set(houseStats);
    this.sellerStats.set(sellerStats);
  }
}
