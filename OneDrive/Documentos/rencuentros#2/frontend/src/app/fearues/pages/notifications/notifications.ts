import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import Swal from 'sweetalert2';
import { FriendshipService } from '../../../modules/amistades/friendship.service';

@Component({
  selector: 'app-notifications',
  imports: [RouterLink, NgIf, NgFor],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications {
  private friendshipService = inject(FriendshipService);
  notifications: Array<any> = [];
  accepted: Array<any> = [];
  loading = false;
  currentUserId: number | null = null;

  constructor() {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { const u = JSON.parse(stored as string); if (u && u.id) this.currentUserId = u.id; } catch (e) { }
    }
    if (this.currentUserId) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    if (!this.currentUserId) return;
    this.loading = true;
    this.friendshipService.getNotifications(this.currentUserId).subscribe({
      next: res => {
        this.notifications = (res && Array.isArray(res.pending)) ? res.pending : [];
        this.accepted = (res && Array.isArray(res.accepted)) ? res.accepted : [];
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        console.error(err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar notificaciones' });
      }
    });
  }

  accept(id_relacion: number) {
    if (!this.currentUserId) {
      Swal.fire({ icon: 'warning', title: 'No autorizado', text: 'Inicia sesión' });
      return;
    }
    this.friendshipService.acceptRequest(id_relacion, this.currentUserId).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Solicitud aceptada' });
        this.notifications = this.notifications.filter(n => !(n.id_relacion === id_relacion || n.ID_RELACION === id_relacion || n.id_relacion_amistad === id_relacion));
        this.loadNotifications();
      },
      error: err => {
        console.error(err);
        const msg = err && err.error ? (err.error.message || JSON.stringify(err.error)) : 'Error aceptando solicitud';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }

  reject(id_relacion: number) {
    if (!this.currentUserId) {
      Swal.fire({ icon: 'warning', title: 'No autorizado', text: 'Inicia sesión' });
      return;
    }
    this.friendshipService.rejectRequest(id_relacion, this.currentUserId).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Solicitud rechazada' });
        this.notifications = this.notifications.filter(n => !(n.id_relacion === id_relacion || n.ID_RELACION === id_relacion || n.id_relacion_amistad === id_relacion));
        this.loadNotifications();
      },
      error: err => {
        console.error(err);
        const msg = err && err.error ? (err.error.message || JSON.stringify(err.error)) : 'Error rechazando solicitud';
        Swal.fire({ icon: 'error', title: 'Error', text: msg });
      }
    });
  }
}

