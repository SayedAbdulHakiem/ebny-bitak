import { Component, model, output } from '@angular/core';
import { inputValue } from '../../core/dom';

@Component({
  selector: 'app-date-range',
  templateUrl: './date-range.html',
})
export class DateRange {
  readonly from = model('');
  readonly to = model('');
  readonly apply = output<void>();

  protected setFrom(event: Event): void {
    this.from.set(inputValue(event));
  }

  protected setTo(event: Event): void {
    this.to.set(inputValue(event));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.apply.emit();
  }
}
