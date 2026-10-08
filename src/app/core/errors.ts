import { HouseAlreadyExistsError, HousePhotosUploadError } from './models';

export function errorMessage(error: unknown): string {
  if (error instanceof HouseAlreadyExistsError) return 'هذا المنزل مسجّل مسبقاً.';
  if (error instanceof HousePhotosUploadError) return error.message;
  if (error instanceof Error && /[\u0600-\u06FF]/.test(error.message)) return error.message;

  const code = firebaseCode(error);
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'البريد أو كلمة المرور غير صحيحة.';
  }
  if (code === 'auth/email-already-in-use') return 'هذا البريد مسجّل مسبقاً.';
  if (code === 'auth/weak-password') return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  if (code === 'auth/invalid-email') return 'البريد الإلكتروني غير صالح.';
  if (code === 'auth/operation-not-allowed') {
    return 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase. فعّله من Authentication ثم أعد المحاولة.';
  }
  if (code === 'auth/too-many-requests') return 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.';
  if (code === 'permission-denied') return 'لا توجد صلاحية لتنفيذ هذه العملية.';
  if (code === 'unavailable') return 'تعذر الاتصال بقاعدة البيانات.';
  return 'تعذر إتمام العملية. تحقق من الاتصال وإعدادات Firebase.';
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String(error.code).replace('firestore/', '').replace('storage/', '');
  }
  return '';
}
