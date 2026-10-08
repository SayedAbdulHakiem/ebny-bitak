import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';
import { SeoService } from '../../core/seo.service';
import { t } from '../../../locale/locale';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected get text() {
    return t();
  }

  constructor() {
    effect(() => {
      const copy = t();
      this.seo.set({
        title: copy.loginPage.title,
        description: copy.loginPage.description,
        path: '/login',
      });
    });
  }

  protected setEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    if (!this.email().includes('@') || this.password().length < 6) {
      this.error.set(t().errors.loginValidation);
      return;
    }
    this.busy.set(true);
    try {
      const profile = await this.auth.login(this.email(), this.password());
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        await this.router.navigateByUrl(returnUrl);
        return;
      }
      await this.router.navigateByUrl(profile.role === 'admin' ? '/admin/sellers' : '/seller/houses');
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
