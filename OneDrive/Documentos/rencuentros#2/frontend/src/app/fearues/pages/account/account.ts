import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-account',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account {
  fb = inject(FormBuilder);
  router = inject(Router)
  http = inject(HttpClient);
  authService = inject(AuthService);
  name = ''
  email = ''
  apellido = ''
  initials = ''

  constructor() {
    // Revisar si hay un usuario en localStorage y precargar datos
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored as string);
        this.name = `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim();
        this.email = user.email ?? '';
        this.apellido = user.apellido ?? '';
        this.profileForm.patchValue({ nombre: user.nombre ?? '', apellido: user.apellido ?? '' });
        this.initials = this.computeInitials(user.nombre ?? '', user.apellido ?? '');
      } catch (e) {
        console.warn('Error parseando user desde localStorage', e);
      }
    } else {
      // Si no hay usuario, redirigir al login
      const userLogged = localStorage.getItem('isLogged');
      if (!userLogged || userLogged !== 'true') {
        this.router.navigate(['/']);
      }
    }
  }

  profileForm = this.fb.group({
    nombre: [''],
    apellido: ['']
  });

  // Form para actualizar contraseña
  passwordForm = this.fb.group({
    actual: [''],
    nueva: [''],
    confirm: ['']
  });

  onLogout() {
    this.authService.logout();
    Swal.fire({
      icon: 'success',
      title: 'Sesión cerrada',
      text: '¡Hasta pronto!',
      timer: 1500,
      showConfirmButton: false
    }).then(() => {
      this.router.navigate(['/']);
    });
  }

  saveProfile() {
    const value = this.profileForm.value as any;
    const updateData: any = { nombre: value.nombre, apellido: value.apellido };

    if (!this.email) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Email de usuario no disponible' });
      return;
    }

    this.http.post('http://localhost:3000/users/update', { email: this.email, updateData }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          const updated = res.user;
          try { localStorage.setItem('user', JSON.stringify(updated)); } catch (e) { console.warn(e); }
          this.name = `${updated.nombre ?? ''} ${updated.apellido ?? ''}`.trim();
          this.apellido = updated.apellido ?? '';
          this.initials = this.computeInitials(updated.nombre ?? '', updated.apellido ?? '');
          this.profileForm.patchValue({ nombre: updated.nombre ?? '', apellido: updated.apellido ?? '' });
          Swal.fire({ icon: 'success', title: 'Guardado', text: 'Tus datos han sido actualizados' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo actualizar' });
        }
      },
      error: (err) => {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Error al actualizar los datos' });
      }
    });
  }

  updatePassword() {
    const value = this.passwordForm.value as any;
    const current = value.actual?.trim();
    const nueva = value.nueva?.trim();
    const confirm = value.confirm?.trim();

    if (!this.email) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Email de usuario no disponible' });
      return;
    }

    if (!current || !nueva || !confirm) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Rellena todos los campos de contraseña' });
      return;
    }

    if (nueva.length < 6) {
      Swal.fire({ icon: 'warning', title: 'Contraseña débil', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (nueva !== confirm) {
      Swal.fire({ icon: 'warning', title: 'Contraseñas no coinciden', text: 'La contraseña nueva y la confirmación no coinciden' });
      return;
    }

    this.http.post('http://localhost:3000/users/updatePassword', { email: this.email, currentPassword: current, newPassword: nueva }).subscribe({
      next: (res: any) => {
        if (res?.success) {
          // Actualizar localStorage si backend devolvió usuario (sin contrasena)
          if (res.user) {
            try { localStorage.setItem('user', JSON.stringify(res.user)); } catch (e) { console.warn(e); }
          }
          // Limpiar campos
          this.passwordForm.reset();
          Swal.fire({ icon: 'success', title: 'Contraseña actualizada', text: 'Tu contraseña ha sido actualizada correctamente' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo actualizar la contraseña' });
        }
      },
      error: (err) => {
        console.error(err);
        const msg = err?.error?.message || 'Error al actualizar la contraseña';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  computeInitials(nombre: string, apellido: string) {
    const a = (nombre || '').trim();
    const b = (apellido || '').trim();
    const first = a ? a.charAt(0).toUpperCase() : '';
    const second = b ? b.charAt(0).toUpperCase() : '';
    return (first + second) || (first || second) || 'U';
  }

  deleteAccount() {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer y eliminará todos tus datos.',
      icon: 'warning',
      showCancelButton: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Lógica para eliminar la cuenta
        this.http.post('http://localhost:3000/users/delete', { email: this.email }).subscribe({
          next: (res: any) => {
            if (res?.success) {
              Swal.fire({ icon: 'success', title: 'Cuenta eliminada', text: 'Tu cuenta ha sido eliminada correctamente' });
              localStorage.removeItem('user');
              this.router.navigate(['/']);
            } else {
              Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo eliminar la cuenta' });
            }
          },
          error: (err) => {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al eliminar la cuenta' });
          }
        });
      }
    });
  }
}
