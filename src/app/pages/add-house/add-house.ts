import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { groupPriceInput } from '../../core/price';
import { assertPhoto, HouseService, MAX_PHOTOS } from '../../core/house.service';
import { buildLocationKey, isRegion, isSector, REGIONS, SECTORS } from '../../core/location';
import { House, HouseAlreadyExistsError, HousePhotosUploadError, sellerTypeLabel } from '../../core/models';
import { AuthService } from '../../core/auth.service';
import { SeoService } from '../../core/seo.service';
import { Stars } from '../../shared/stars/stars';
import { t } from '../../../locale/locale';

@Component({
  selector: 'app-add-house',
  imports: [RouterLink, Stars],
  templateUrl: './add-house.html',
})
export class AddHousePage {
  private readonly houses = inject(HouseService);
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly regions = REGIONS;
  protected readonly sectors = SECTORS;
  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected get text() {
    return t();
  }
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly region = signal('1');
  protected readonly sector = signal<string>(SECTORS[0]);
  protected readonly houseNumber = signal('');
  protected readonly price = signal('');
  protected readonly youtubeUrl = signal('');
  protected readonly photos = signal<{ file: File; preview: string }[]>([]);
  protected readonly existing = signal<House | null>(null);
  protected readonly checking = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly successId = signal('');
  protected readonly successKind = signal<'' | 'published' | 'photos'>('');

  constructor() {
    effect(() => {
      const copy = t();
      this.seo.set({
        title: copy.addHousePage.title,
        description: copy.addHousePage.description,
        path: '/seller/houses/new',
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.photos().forEach((photo) => URL.revokeObjectURL(photo.preview));
      if (this.timer) clearTimeout(this.timer);
    });
  }

  protected setName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected setDescription(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  protected setRegion(event: Event): void {
    this.region.set((event.target as HTMLSelectElement).value);
    this.scheduleCheck();
  }

  protected setSector(event: Event): void {
    this.sector.set((event.target as HTMLSelectElement).value);
    this.scheduleCheck();
  }

  protected setHouseNumber(event: Event): void {
    this.houseNumber.set((event.target as HTMLInputElement).value);
    this.scheduleCheck();
  }

  protected setPrice(event: Event): void {
    const input = event.target as HTMLInputElement;
    const grouped = groupPriceInput(input.value, input.selectionStart ?? input.value.length);
    this.price.set(grouped.text);
    input.value = grouped.text;
    input.setSelectionRange(grouped.caret, grouped.caret);
  }

  protected setYoutubeUrl(event: Event): void {
    this.youtubeUrl.set((event.target as HTMLInputElement).value);
  }

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (this.photos().length + files.length > MAX_PHOTOS) {
      this.error.set(t().errors.maxPhotos(MAX_PHOTOS));
      return;
    }
    try {
      files.forEach(assertPhoto);
    } catch (error) {
      this.error.set(errorMessage(error));
      return;
    }
    this.error.set('');
    this.photos.update((current) => [
      ...current,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  }

  protected removePhoto(index: number): void {
    this.photos.update((current) => {
      const next = [...current];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  protected canEdit(house: House): boolean {
    return this.auth.profile()?.uid === house.sellerId;
  }

  protected canUploadPhotos(house: House): boolean {
    return this.auth.profile()?.uid === house.sellerId && house.photos.length === 0;
  }

  protected async uploadExistingPhotos(): Promise<void> {
    const current = this.existing();
    if (!current || !this.canUploadPhotos(current)) return;
    if (this.photos().length === 0) {
      this.error.set(t().addHousePage.chooseOne);
      return;
    }
    this.error.set('');
    this.successId.set('');
    this.successKind.set('');
    this.busy.set(true);
    try {
      const updated = await this.houses.addPhotos(
        current.id,
        this.photos().map((photo) => photo.file),
      );
      this.successKind.set('photos');
      this.successId.set(updated.id);
      this.existing.set(updated);
      this.clearDraft();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.successId.set('');
    this.successKind.set('');
    const name = this.name().trim();
    const description = this.description().trim();
    const region = Number(this.region());
    if (name.length < 3 || name.length > 80) {
      this.error.set(t().errors.shortDescription);
      return;
    }
    if (description.length < 10 || description.length > 600) {
      this.error.set(t().errors.description);
      return;
    }
    if (!buildLocationKey(region, this.sector(), this.houseNumber())) {
      this.error.set(t().errors.locationRules);
      return;
    }

    await this.checkExisting();
    if (this.existing()) return;

    this.busy.set(true);
    try {
      const created = await this.houses.create({
        name,
        description,
        region,
        sector: this.sector(),
        houseNumber: this.houseNumber(),
        price: this.price(),
        youtubeUrl: this.youtubeUrl(),
        photos: this.photos().map((photo) => photo.file),
      });
      this.successKind.set('published');
      this.successId.set(created.id);
      this.clearDraft();
    } catch (error) {
      if (error instanceof HouseAlreadyExistsError) this.existing.set(error.house);
      if (error instanceof HousePhotosUploadError) {
        this.successKind.set('published');
        this.successId.set(error.house.id);
        this.clearDraft();
      }
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private clearDraft(): void {
    this.photos().forEach((photo) => URL.revokeObjectURL(photo.preview));
    this.photos.set([]);
    this.name.set('');
    this.description.set('');
    this.houseNumber.set('');
    this.price.set('');
    this.youtubeUrl.set('');
  }

  private scheduleCheck(): void {
    this.successId.set('');
    this.successKind.set('');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.checkExisting(), 400);
  }

  private async checkExisting(): Promise<void> {
    const region = Number(this.region());
    if (!isRegion(region) || !isSector(this.sector()) || !buildLocationKey(region, this.sector(), this.houseNumber())) {
      this.existing.set(null);
      return;
    }
    this.checking.set(true);
    try {
      this.existing.set(await this.houses.findByLocation(region, this.sector(), this.houseNumber()));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.checking.set(false);
    }
  }
}
