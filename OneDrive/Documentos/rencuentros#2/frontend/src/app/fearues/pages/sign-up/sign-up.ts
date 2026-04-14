import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
  templateUrl: './sign-up.html',
  styleUrls: ['./sign-up.css']
})
export class SignUp {
  fb = inject(FormBuilder);
  route = inject(Router);
  authService = inject(AuthService);

  signUpForm = this.fb.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  get nombre() {
    return this.signUpForm.get('nombre');
  }

  get apellido() {
    return this.signUpForm.get('apellido');
  }

  get email() {
    return this.signUpForm.get('email');
  }

  get contrasena() {
    return this.signUpForm.get('contrasena');
  }

  get confirmPassword() {
    return this.signUpForm.get('confirmPassword');
  }

  onSignUp() {
    if (this.signUpForm.valid) {
      const value = this.signUpForm.value as any;

      // Verificar confirmación de contraseña en el cliente
      if (value.contrasena !== value.confirmPassword) {
        Swal.fire({ icon: 'warning', title: 'Contraseñas no coinciden', text: 'Por favor verifica las contraseñas' });
        return;
      }

      this.authService.register(
        value.nombre,
        value.email,
        value.contrasena,
        value.apellido
      ).subscribe({
        next: (response) => {
          Swal.fire({
            icon: 'success',
            title: 'Cuenta creada',
            text: '¡Bienvenido a Encuentros!',
            timer: 1500,
            showConfirmButton: false
          });
          this.route.navigate(['/home']);
        },
        error: (err) => {
          console.error(err);
          const msg = err?.error?.message || 'Hubo un problema al crear tu cuenta';
          Swal.fire({ icon: 'error', title: 'Error', text: msg });
        }
      });
    }
  }
}
  