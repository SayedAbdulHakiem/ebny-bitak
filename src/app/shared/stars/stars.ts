import { Component, computed, input } from '@angular/core';
import { numberLocale, t } from '../../../locale/locale';

@Component({
  selector: 'app-stars',
  templateUrl: './stars.html',
})
export class Stars {
  readonly rating = input(0);
  protected readonly score = computed(() => Math.max(0, Math.min(5, this.rating())));
  protected readonly label = computed(() => {
    const value = new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 1 }).format(this.score());
    return t().ratingLabel(value);
  });
  protected readonly marks = [1, 2, 3, 4, 5];

  protected state(mark: number): string {
    if (this.score() >= mark) return 'star on';
    if (this.score() + 0.5 >= mark) return 'star half';
    return 'star';
  }
}
