import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { HouseService } from '../../core/house.service';
import { House, sellerTypeLabel } from '../../core/models';
import { formatPrice } from '../../core/price';
import { SeoService } from '../../core/seo.service';
import { Stars } from '../../shared/stars/stars';

@Component({
  selector: 'app-seller-houses',
  imports: [RouterLink, Stars],
  templateUrl: './seller-houses.html',
})
export class SellerHousesPage {
  private readonly housesService = inject(HouseService);
  private readonly seo = inject(SeoService);

  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly formatPrice = formatPrice;
  protected readonly houses = signal<House[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    this.seo.set({
      title: 'منازلي | ابني بيتك',
      description: 'إعلانات البائع المنشورة في ابني بيتك، مع تعديل الوصف والصور.',
      path: '/seller/houses',
    });
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.houses.set(await this.housesService.listMine());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
