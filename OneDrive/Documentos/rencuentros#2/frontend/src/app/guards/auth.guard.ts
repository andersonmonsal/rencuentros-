import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  console.log('AuthGuard - isAuthenticated:', isAuth);
  console.log('AuthGuard - Token:', authService.getToken());
  console.log('AuthGuard - CurrentUser:', authService.getCurrentUser());

  if (isAuth) {
    return true;
  }

  // Redirigir al login si no está autenticado
  console.log('AuthGuard - Redirigiendo a login');
  router.navigate(['/']);
  return false;
};
