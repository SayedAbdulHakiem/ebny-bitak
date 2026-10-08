import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { FirebaseService } from './core/firebase.service';
import { sellerTypeLabel } from './core/models';
import { localeId, setLocale, t, type LocaleId } from '../locale/locale';
import { Icon } from './shared/icon/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly firebase = inject(FirebaseService);
  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly otherLanguage = computed(() => (localeId() === 'ar' ? 'English' : 'العربية'));
  protected get text() {
    return t();
  }
  protected readonly menuOpen = signal(false);

  protected switchLocale(): void {
    const next: LocaleId = localeId() === 'ar' ? 'en' : 'ar';
    setLocale(next);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
