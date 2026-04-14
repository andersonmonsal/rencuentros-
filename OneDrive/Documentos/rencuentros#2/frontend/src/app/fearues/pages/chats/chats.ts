import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-chats',
  imports: [RouterLink, CommonModule],
  templateUrl: './chats.html',
  styleUrl: './chats.css'
})
export class Chats implements OnInit {
  http = inject(HttpClient);
  currentUserId: number | null = null;
  
  chats: Array<{
    id: number;
    titulo: string;
    descripcion: string;
    lugar: string;
    fecha: Date | string;
    initials: string;
    lastMessage?: string;
    timeLabel?: string;
  }> = [];

  constructor() {
    // Obtener el usuario actual
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user && user.id) {
          this.currentUserId = user.id;
        }
      } catch (e) {
        console.warn('Error parseando user desde localStorage', e);
      }
    }
  }

  ngOnInit() {
    this.loadChats();
  }

  loadChats() {
    if (!this.currentUserId) {
      console.warn('No hay usuario logueado');
      return;
    }

    // Cargar encuentros desde el backend
    this.http.get<any[]>(`http://localhost:3000/encuentro?creador=${this.currentUserId}`).subscribe({
      next: (encuentros) => {
        this.chats = encuentros
          .filter((encuentro: any) => encuentro && encuentro.titulo) // Filtrar encuentros vacíos o sin título
          .map((encuentro: any) => {
            const initials = encuentro.titulo
              ? encuentro.titulo.split(' ').map((word: string) => word[0]).join('').substring(0, 2).toUpperCase()
              : 'EN';
            
            let timeLabel = '';
            
            // Validar que la fecha existe y es válida
            if (encuentro.fecha) {
              try {
                const fecha = new Date(encuentro.fecha);
                const now = new Date();
                
                // Verificar que la fecha sea válida
                if (!isNaN(fecha.getTime())) {
                  const isToday = fecha.getDate() === now.getDate() && 
                                  fecha.getMonth() === now.getMonth() && 
                                  fecha.getFullYear() === now.getFullYear();
                  
                  const isYesterday = fecha.getDate() === now.getDate() - 1 && 
                                      fecha.getMonth() === now.getMonth() && 
                                      fecha.getFullYear() === now.getFullYear();
                  
                  if (isToday) {
                    timeLabel = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                  } else if (isYesterday) {
                    timeLabel = 'Ayer';
                  } else {
                    timeLabel = fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  }
                } else {
                  timeLabel = 'Fecha inválida';
                }
              } catch (e) {
                console.error('Error procesando fecha', e);
                timeLabel = 'Fecha no disponible';
              }
            } else {
              timeLabel = 'Sin fecha';
            }

            return {
              id: encuentro.id,
              titulo: encuentro.titulo,
              descripcion: encuentro.descripcion,
              lugar: encuentro.lugar,
              fecha: encuentro.fecha,
              initials,
              lastMessage: `Chat del encuentro${encuentro.lugar ? ' en ' + encuentro.lugar : ''}`,
              timeLabel
            };
          });
      },
      error: (err) => {
        console.error('Error cargando encuentros', err);
        this.chats = [];
      }
    });
  }
}
