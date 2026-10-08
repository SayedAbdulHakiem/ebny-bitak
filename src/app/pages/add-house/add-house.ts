import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { assertPhoto, HouseService } from '../../core/house.service';
import { buildLocationKey, isRegion, isSector, REGIONS, SECTORS } from '../../core/location';
import { House, HouseAlreadyExistsError, sellerTypeLabel } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { Stars } from '../../shared/stars/stars';

@Component({
  selector: 'app-add-house',
  imports: [RouterLink, Stars],
  templateUrl: './add-house.html',
})
export class AddHousePage {
  private readonly houses = inject(HouseService);
  private readonly seo = inject(SeoService);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly regions = REGIONS;
  protected readonly sectors = SECTORS;
  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly region = signal('1');
  protected readonly sector = signal<string>(SECTORS[0]);
  protected readonly houseNumber = signal('');
  protected readonly photos = signal<{ file: File; preview: string }[]>([]);
  protected readonly existing = signal<House | null>(null);
  protected readonly checking = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly successId = signal('');

  constructor() {
    this.seo.set({
      title: 'إضافة منزل | ابني بيتك',
      description: 'يضيف البائع منزلاً جديداً في ابني بيتك بعد التحقق من المنطقة والقطاع ورقم المنزل، بحد أقصى 3 صور.',
      path: '/seller/houses/new',
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

  protected addPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (this.photos().length + files.length > 3) {
      this.error.set('الحد الأقصى 3 صور لكل منزل.');
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

  protected async submit(): Promise<void> {
    this.error.set('');
    this.successId.set('');
    const name = this.name().trim();
    const description = this.description().trim();
    const region = Number(this.region());
    if (name.length < 3 || name.length > 80) {
      this.error.set('اسم المنزل يجب أن يكون من 3 إلى 80 حرفاً.');
      return;
    }
    if (description.length < 10 || description.length > 600) {
      this.error.set('وصف المنزل يجب أن يكون من 10 إلى 600 حرف.');
      return;
    }
    if (!buildLocationKey(region, this.sector(), this.houseNumber())) {
      this.error.set('المنطقة من 1 إلى 7، والقطاع من أ إلى ي، ورقم المنزل حروف أو أرقام بدون رمز _.');
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
        photos: this.photos().map((photo) => photo.file),
      });
      this.successId.set(created.id);
      this.photos().forEach((photo) => URL.revokeObjectURL(photo.preview));
      this.photos.set([]);
      this.name.set('');
      this.description.set('');
      this.houseNumber.set('');
    } catch (error) {
      if (error instanceof HouseAlreadyExistsError) this.existing.set(error.house);
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private scheduleCheck(): void {
    this.successId.set('');
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
