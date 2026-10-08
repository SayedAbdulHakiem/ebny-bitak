import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { HouseService } from '../../core/house.service';
import { House, sellerTypeLabel } from '../../core/models';
import { formatPrice } from '../../core/price';
import { SeoService } from '../../core/seo.service';
import { Stars } from '../../shared/stars/stars';
import { t } from '../../../locale/locale';

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
  protected get text() {
    return t();
  }
  protected readonly houses = signal<House[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    effect(() => {
      const copy = t();
      this.seo.set({
        title: copy.myHousesPage.title,
        description: copy.myHousesPage.description,
        path: '/seller/houses',
      });
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
