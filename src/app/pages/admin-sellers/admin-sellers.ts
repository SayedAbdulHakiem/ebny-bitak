import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';
import { SellerType, SELLER_TYPES, sellerTypeLabel, isSellerType, AppUser } from '../../core/models';
import { SeoService } from '../../core/seo.service';

@Component({
  selector: 'app-admin-sellers',
  templateUrl: './admin-sellers.html',
})
export class AdminSellersPage {
  private readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);

  protected readonly sellerTypes = SELLER_TYPES;
  protected readonly sellerTypeLabel = sellerTypeLabel;
  protected readonly sellers = signal<AppUser[]>([]);
  protected readonly editingId = signal('');
  protected readonly displayName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly phone = signal('');
  protected readonly sellerType = signal<SellerType>('owner');
  protected readonly rating = signal(0);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly busy = signal(false);
  protected readonly loading = signal(true);

  constructor() {
    this.seo.set({
      title: 'إدارة البائعين | ابني بيتك',
      description: 'صفحة المدير في ابني بيتك لإضافة البائعين. صلاحية المدير تُعيَّن من قاعدة البيانات فقط.',
      path: '/admin/sellers',
    });
    void this.reload();
  }

  protected setName(event: Event): void {
    this.displayName.set((event.target as HTMLInputElement).value);
  }

  protected setEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  protected setPhone(event: Event): void {
    this.phone.set((event.target as HTMLInputElement).value);
  }

  protected setType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isSellerType(value)) this.sellerType.set(value);
  }

  protected setRating(event: Event): void {
    this.rating.set(Number((event.target as HTMLInputElement).value));
  }

  protected edit(seller: AppUser): void {
    this.editingId.set(seller.uid);
    this.displayName.set(seller.displayName);
    this.email.set(seller.email);
    this.password.set('');
    this.phone.set(seller.phone);
    this.sellerType.set(seller.sellerType ?? 'owner');
    this.rating.set(seller.rating);
    this.error.set('');
    this.success.set('');
  }

  protected cancelEdit(): void {
    this.editingId.set('');
    this.displayName.set('');
    this.email.set('');
    this.password.set('');
    this.phone.set('');
    this.sellerType.set('owner');
    this.rating.set(0);
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.success.set('');
    const name = this.displayName().trim();
    const phone = this.phone().trim();
    const digits = phone.replace(/\D/g, '');
    if (name.length < 3) {
      this.error.set('اسم البائع يجب أن يكون 3 أحرف على الأقل.');
      return;
    }
    if (digits.length < 8 || digits.length > 15) {
      this.error.set('رقم الهاتف يجب أن يحتوي على 8 إلى 15 رقماً.');
      return;
    }
    if (this.rating() < 0 || this.rating() > 5) {
      this.error.set('التقييم من 0 إلى 5.');
      return;
    }

    this.busy.set(true);
    try {
      if (this.editingId()) {
        await this.auth.updateSeller({
          uid: this.editingId(),
          displayName: name,
          phone,
          sellerType: this.sellerType(),
          rating: this.rating(),
        });
        this.success.set('تم تحديث بيانات البائع وإعلاناته.');
        this.cancelEdit();
      } else {
        if (!this.email().includes('@') || this.password().length < 6) {
          this.error.set('أدخل بريداً صحيحاً وكلمة مرور من 6 أحرف على الأقل.');
          return;
        }
        await this.auth.createSeller({
          displayName: name,
          email: this.email().trim(),
          password: this.password(),
          phone,
          sellerType: this.sellerType(),
          rating: this.rating(),
        });
        this.success.set('تم إنشاء حساب البائع. يمكنه الدخول الآن.');
        this.cancelEdit();
      }
      await this.reload();
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.sellers.set(await this.auth.listSellers());
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
