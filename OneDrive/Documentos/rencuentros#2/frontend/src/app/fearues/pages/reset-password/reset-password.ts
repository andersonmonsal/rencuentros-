import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reset-password',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  fb = inject(FormBuilder);
  router = inject(Router);
  route = inject(ActivatedRoute);
  authService = inject(AuthService);

  private resetToken: string = '';

  resetPasswordForm = this.fb.group({
    nuevaContrasena: ['', [Validators.required, Validators.minLength(8)]],
    confirmarContrasena: ['', [Validators.required]],
  });

  get nuevaContrasena() {
    return this.resetPasswordForm.get('nuevaContrasena');
  }

  get confirmarContrasena() {
    return this.resetPasswordForm.get('confirmarContrasena');
  }

  ngOnInit() {
    // Leer el token de los query params
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.resetToken = params['token'];
      } else {
        // Si no hay token, mostrar error y redirigir
        Swal.fire({
          icon: 'error',
          title: 'Token no válido',
          text: 'No se encontró un token de recuperación válido',
          confirmButtonText: 'Volver al inicio'
        }).then(() => {
          this.router.navigate(['/']);
        });
      }
    });
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.resetToken) {
      const { nuevaContrasena, confirmarContrasena } = this.resetPasswordForm.value;

      // Validar que las contraseñas coincidan
      if (nuevaContrasena !== confirmarContrasena) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Las contraseñas no coinciden'
        });
        return;
      }

      this.authService.resetPassword(this.resetToken, nuevaContrasena!).subscribe({
        next: (res) => {
          Swal.fire({
            icon: 'success',
            title: 'Contraseña restablecida',
            text: res.message,
            confirmButtonText: 'Ir a iniciar sesión'
          }).then(() => {
            this.router.navigate(['/']);
          });
        },
        error: (err) => {
          console.error('Error:', err);
          const errorMessage = err.error?.message || 'Error al restablecer la contraseña';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        },
      });
    }
  }
}
