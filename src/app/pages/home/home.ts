import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { errorMessage } from '../../core/errors';
import { HouseService } from '../../core/house.service';
import { isRegion, isSector, REGIONS, SECTORS } from '../../core/location';
import { House } from '../../core/models';
import { SeoService } from '../../core/seo.service';
import { HouseCard } from '../../shared/house-card/house-card';
import { t } from '../../../locale/locale';

type FilterMenu = 'region' | 'sector';

@Component({
  selector: 'app-home',
  imports: [HouseCard],
  templateUrl: './home.html',
})
export class HomePage {
  private readonly houses = inject(HouseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly regions = REGIONS;
  protected readonly sectors = SECTORS;
  protected readonly selectedRegions = signal<number[]>([]);
  protected readonly selectedSectors = signal<string[]>([]);
  protected readonly houseNumber = signal('');
  protected readonly openMenu = signal<FilterMenu | null>(null);
  protected readonly results = signal<House[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly searched = signal(false);
  protected get text() {
    return t();
  }

  constructor() {
    effect(() => {
      const copy = t();
      this.seo.set({
        title: copy.home.title,
        description: copy.home.description,
        path: '/',
      });
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.selectedRegions.set(parseRegions(params.get('region')));
      this.selectedSectors.set(parseSectors(params.get('sector')));
      this.houseNumber.set(params.get('house') ?? '');
      void this.search();
    });
  }

  @HostListener('document:click', ['$event'])
  protected closeMenus(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.filter-dropdown')) {
      this.openMenu.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  protected closeMenusOnEscape(): void {
    this.openMenu.set(null);
  }

  protected toggleMenu(menu: FilterMenu): void {
    this.openMenu.update((current) => (current === menu ? null : menu));
  }

  protected regionLabel(): string {
    const selected = this.selectedRegions();
    if (selected.length === 0) return t().allRegions;
    if (selected.length === 1) return t().regionOne(selected[0]);
    return t().regionCount(selected.length);
  }

  protected sectorLabel(): string {
    const selected = this.selectedSectors();
    if (selected.length === 0) return t().allSectors;
    if (selected.length === 1) return t().sectorOne(selected[0]);
    return t().sectorCount(selected.length);
  }

  protected isRegionSelected(region: number): boolean {
    return this.selectedRegions().includes(region);
  }

  protected isSectorSelected(sector: string): boolean {
    return this.selectedSectors().includes(sector);
  }

  protected toggleRegion(region: number, event: Event): void {
    event.stopPropagation();
    const selected = this.selectedRegions();
    const next = selected.includes(region)
      ? selected.filter((item) => item !== region)
      : [...selected, region].sort((a, b) => a - b);
    this.selectedRegions.set(next);
    void this.submit();
  }

  protected toggleSector(sector: string, event: Event): void {
    event.stopPropagation();
    const selected = this.selectedSectors();
    const next = selected.includes(sector) ? selected.filter((item) => item !== sector) : [...selected, sector];
    this.selectedSectors.set(SECTORS.filter((item) => next.includes(item)));
    void this.submit();
  }

  protected setHouseNumber(event: Event): void {
    this.houseNumber.set((event.target as HTMLInputElement).value);
  }

  protected removeRegion(region: number): void {
    this.selectedRegions.update((current) => current.filter((item) => item !== region));
    void this.submit();
  }

  protected removeSector(sector: string): void {
    this.selectedSectors.update((current) => current.filter((item) => item !== sector));
    void this.submit();
  }

  protected removeHouseNumber(): void {
    this.houseNumber.set('');
    void this.submit();
  }

  protected clearFilters(): void {
    this.selectedRegions.set([]);
    this.selectedSectors.set([]);
    this.houseNumber.set('');
    this.openMenu.set(null);
    void this.submit();
  }

  protected hasFilters(): boolean {
    return this.selectedRegions().length > 0 || this.selectedSectors().length > 0 || this.houseNumber().trim().length > 0;
  }

  protected async submit(): Promise<void> {
    const queryParams = {
      region: this.selectedRegions().join(',') || null,
      sector: this.selectedSectors().join(',') || null,
      house: this.houseNumber().trim() || null,
    };
    const current = this.route.snapshot.queryParamMap;
    const same =
      (current.get('region') ?? '') === (queryParams.region ?? '') &&
      (current.get('sector') ?? '') === (queryParams.sector ?? '') &&
      (current.get('house') ?? '') === (queryParams.house ?? '');
    if (same) {
      await this.search();
      return;
    }
    await this.router.navigate(['/'], { queryParams });
  }

  private async search(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.searched.set(true);
    try {
      this.results.set(
        await this.houses.search({
          regions: this.selectedRegions(),
          sectors: this.selectedSectors(),
          houseNumber: this.houseNumber().trim() || null,
        }),
      );
    } catch (error) {
      this.results.set([]);
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}

function parseRegions(value: string | null): number[] {
  if (!value) return [];
  const regions = value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => isRegion(item));
  return [...new Set(regions)].sort((a, b) => a - b);
}

function parseSectors(value: string | null): string[] {
  if (!value) return [];
  const sectors = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => isSector(item));
  return SECTORS.filter((item) => sectors.includes(item));
}
