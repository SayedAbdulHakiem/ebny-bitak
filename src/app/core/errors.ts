import { HouseAlreadyExistsError, HousePhotosUploadError } from './models';
import { t } from '../../locale/locale';

export function errorMessage(error: unknown): string {
  if (error instanceof HouseAlreadyExistsError) return t().errors.houseExists;
  if (error instanceof HousePhotosUploadError) return error.message;

  const code = firebaseCode(error);
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return t().errors.badCredentials;
  }
  if (code === 'auth/email-already-in-use') return t().errors.emailInUse;
  if (code === 'auth/weak-password') return t().errors.weakPassword;
  if (code === 'auth/invalid-email') return t().errors.invalidEmail;
  if (code === 'auth/operation-not-allowed') return t().errors.passwordLoginDisabled;
  if (code === 'auth/too-many-requests') return t().errors.tooManyRequests;
  if (code === 'permission-denied') return t().errors.permissionDenied;
  if (code === 'unavailable') return t().errors.unavailable;
  if (error instanceof Error && error.message) return error.message;
  return t().errors.generic;
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String(error.code).replace('firestore/', '').replace('storage/', '');
  }
  return '';
}
