import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  fb = inject(FormBuilder);
  router = inject(Router);
  authService = inject(AuthService);

  forgotPasswordForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email!;

      this.authService.forgotPassword(email).subscribe({
        next: (res) => {
          // En desarrollo, redirigir automáticamente con el token en la URL
          if (res.resetToken) {
            Swal.fire({
              icon: 'success',
              title: 'Solicitud enviada',
              text: 'Serás redirigido para establecer tu nueva contraseña',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.router.navigate(['/reset-password'], {
                queryParams: { token: res.resetToken }
              });
            });
          } else {
            // En producción (cuando se implemente email)
            Swal.fire({
              icon: 'success',
              title: 'Solicitud enviada',
              text: res.message,
              confirmButtonText: 'Entendido'
            }).then(() => {
              this.router.navigate(['/']);
            });
          }
        },
        error: (err) => {
          console.error('Error:', err);
          const errorMessage = err.error?.message || 'Error al procesar la solicitud';
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
