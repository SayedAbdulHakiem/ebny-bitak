import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { groupPriceInput } from '../../core/price';
import { assertPhoto, HouseService, MAX_PHOTOS } from '../../core/house.service';
import { House } from '../../core/models';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-edit-house',
  imports: [RouterLink],
  templateUrl: './edit-house.html',
})
export class EditHousePage {
  private readonly route = inject(ActivatedRoute);
  private readonly houses = inject(HouseService);
  private readonly seo = inject(SeoService);

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly house = signal<House | null>(null);
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly price = signal('');
  protected readonly youtubeUrl = signal('');
  protected readonly kept = signal<{ ref: string; preview: string }[]>([]);
  protected readonly added = signal<{ file: File; preview: string }[]>([]);
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);

  constructor() {
    this.seo.set({
      title: 'تعديل منزل | ابني بيتك',
      description: 'يعدّل البائع وصف منزله وصوره في ابني بيتك.',
      path: '/seller/houses',
    });
    inject(DestroyRef).onDestroy(() => {
      this.added().forEach((photo) => URL.revokeObjectURL(photo.preview));
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id) void this.load(id);
    });
  }

  protected setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.saved.set(false);
  }

  protected setDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
    this.saved.set(false);
  }

  protected setPrice(event: Event): void {
    const input = event.target as HTMLInputElement;
    const grouped = groupPriceInput(input.value, input.selectionStart ?? input.value.length);
    this.price.set(grouped.text);
    input.value = grouped.text;
    input.setSelectionRange(grouped.caret, grouped.caret);
    this.saved.set(false);
  }

  protected setYoutubeUrl(event: Event): void {
    this.youtubeUrl.set((event.target as HTMLInputElement).value);
    this.saved.set(false);
  }

  protected removeKept(index: number): void {
    this.kept.update((current) => current.filter((_, itemIndex) => itemIndex !== index));
    this.saved.set(false);
  }

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (this.kept().length + this.added().length + files.length > MAX_PHOTOS) {
      this.error.set(`الحد الأقصى ${MAX_PHOTOS} صور لكل منزل.`);
      return;
    }
    try {
      files.forEach(assertPhoto);
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.error.set('');
    this.saved.set(false);
    this.added.update((current) => [...current, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  protected removeAdded(index: number): void {
    this.added.update((current) => {
      const next = [...current];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
    this.saved.set(false);
  }

  protected async save(): Promise<void> {
    const current = this.house();
    if (!current) return;
    const name = this.name().trim();
    const description = this.description().trim();
    if (name.length < 3 || name.length > 80) {
      this.error.set('الوصف المختصر يجب أن يكون من 3 إلى 80 حرفاً.');
      return;
    }
    if (description.length < 10 || description.length > 600) {
      this.error.set('وصف المنزل يجب أن يكون من 10 إلى 600 حرف.');
      return;
    }
    this.error.set('');
    this.saved.set(false);
    this.busy.set(true);
    try {
      const updated = await this.houses.update(current.id, {
        name,
        description,
        price: this.price(),
        youtubeUrl: this.youtubeUrl(),
        keepPhotoRefs: this.kept().map((photo) => photo.ref),
        photos: this.added().map((photo) => photo.file),
      });
      this.added().forEach((photo) => URL.revokeObjectURL(photo.preview));
      this.added.set([]);
      this.apply(updated.house, updated.photoRefs);
      this.saved.set(true);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    this.missing.set(false);
    this.error.set('');
    this.saved.set(false);
    this.added().forEach((photo) => URL.revokeObjectURL(photo.preview));
    this.added.set([]);
    try {
      const editable = await this.houses.getOwned(id);
      if (!editable) {
        this.house.set(null);
        this.missing.set(true);
        return;
      }
      this.apply(editable.house, editable.photoRefs);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(house: House, photoRefs: string[]): void {
    this.house.set(house);
    this.name.set(house.name);
    this.description.set(house.description);
    this.price.set(house.price > 0 ? groupPriceInput(String(house.price), String(house.price).length).text : '');
    this.youtubeUrl.set(house.youtubeUrl);
    this.kept.set(photoRefs.map((ref, index) => ({ ref, preview: house.photos[index] ?? '' })));
  }
}
