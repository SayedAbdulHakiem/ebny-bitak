import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { sellerTypeLabel, House } from '../../core/models';
import { formatPrice } from '../../core/price';
import { Stars } from '../stars/stars';
import { t } from '../../../locale/locale';

@Component({
  selector: 'app-house-card',
  imports: [RouterLink, Stars],
  templateUrl: './house-card.html',
})
export class HouseCard {
  readonly house = input.required<House>();
  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly formatPrice = formatPrice;
  protected get text() {
    return t();
  }
}
