import { NgFor, NgIf, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { EncuentroService } from '../../../services/encuentro.service';

@Component({
  selector: 'app-home',
  imports: [NgFor, NgIf, CommonModule, RouterLink, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  router = inject(Router);
  http = inject(HttpClient);
  encuentroService = inject(EncuentroService);
  month: string;
  days: number[] = [];
  emptyDays: number[] = []; // Celdas vacías antes del día 1
  showCreate = false;
  currentUserId: number | null = null;
  currentMonthIndex: number | null = null;
  currentYear: number | null = null;

  // lista de encuentros traídos del backend
  encuentros: Array<{
    id: number;
    idCreador?: number;
    titulo: string;
    descripcion?: string;
    lugar: string;
    fecha: string | Date | null;
    fechaCreacion?: string | Date | null;
    displayWhen?: string;
    // Campos adicionales: solo presupuesto y participantes
    idPresupuesto?: number | null;
    presupuestoTotal?: number;
    cantParticipantes?: number;
  }> = [];

  // métricas
  encuentrosHoy = 0;
  encuentrosMes = 0;
  encuentrosPendientes = 0;
  upcoming: typeof this.encuentros = [];
  // días del mes que tienen encuentros (números de día)
  daysWithEncuentros: Set<number> = new Set();

  // modelo simple para el formulario de creación
  newEncuentro: {
    idCreador?: number | null;
    titulo: string;
    descripcion: string;
    lugar: string;
    fecha: string;
  } = {
    idCreador: null,
    titulo: '',
    descripcion: '',
    lugar: '',
    fecha: '',
  };

  creating = false;

  constructor() {
    const stored = localStorage.getItem('user');
    console.log('User from localStorage:', stored); // Debug
    if (stored) {
      try {
        const user = JSON.parse(stored);
        console.log('Parsed user:', user); // Debug
        // si el usuario tiene id, prellenarlo como idCreador
        if (user && user.id) {
          this.newEncuentro.idCreador = user.id;
          this.currentUserId = user.id;
          console.log('User ID set:', this.currentUserId); // Debug
        } else {
          console.warn('User object exists but has no id property:', user);
        }
      } catch (e) {
        console.error('Error parseando user desde localStorage', e);
      }
    } else {
      console.warn('No user found in localStorage');
      // Si no hay usuario, redirigir al login
      const userLogged = localStorage.getItem('isLogged');
      if (!userLogged || userLogged !== 'true') {
        this.router.navigate(['/']);
      }
    }

    const today = new Date();
    const year = today.getFullYear();
    const monthIndex = today.getMonth();
    this.currentYear = year;
    this.currentMonthIndex = monthIndex;
    this.month = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    this.days = Array.from({ length: lastDay }, (_, i) => i + 1);
    
    // Calcular el día de la semana en que comienza el mes (0=domingo, 1=lunes, etc.)
    const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
    // Ajustar para que lunes sea 0 (el calendario muestra Lun, Mar, Mié, etc.)
    const firstDayAdjusted = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    // Crear array de celdas vacías
    this.emptyDays = Array.from({ length: firstDayAdjusted }, (_, i) => i);
    
    // carga inicial de encuentros para el usuario
    if (this.currentUserId) {
      this.loadEncuentros();
    }
  }
  toggleCreate() {
    this.showCreate = !this.showCreate;
  }

  createEncuentro() {
    if (this.creating) return;
    // Validaciones mínimas
    if (
      !this.newEncuentro.titulo ||
      !this.newEncuentro.descripcion ||
      !this.newEncuentro.lugar ||
      !this.newEncuentro.fecha
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos',
      });
      return;
    }

    // Validar que la fecha no sea pasada
    const selectedDate = new Date(this.newEncuentro.fecha);
    if (selectedDate.getTime() < Date.now()) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha inválida',
        text: 'La fecha del encuentro no puede ser en el pasado',
      });
      return;
    }

    const payload: any = {
      idCreador: this.newEncuentro.idCreador,
      titulo: this.newEncuentro.titulo,
      descripcion: this.newEncuentro.descripcion,
      lugar: this.newEncuentro.lugar,
      fecha: new Date(this.newEncuentro.fecha),
    };

    this.creating = true;
    this.http.post('http://localhost:3000/encuentro', payload, { responseType: 'json' }).subscribe({
      next: (res: any) => {
        this.creating = false;
        this.showCreate = false;

        // limpiar formulario
        this.newEncuentro.titulo = '';
        this.newEncuentro.descripcion = '';
        this.newEncuentro.lugar = '';
        this.newEncuentro.fecha = '';
        Swal.fire({
          icon: 'success',
          title: 'Encuentro creado',
          text: 'El encuentro ha sido creado correctamente y está disponible en Chats',
        });
        // refrescar lista de encuentros
        if (this.currentUserId) this.loadEncuentros();
      },
      error: (err) => {
        this.creating = false;
        console.error('Error creando encuentro', err);
        const errorMsg = err.error?.message || 'Hubo un error al crear el encuentro.';
        Swal.fire({
          icon: 'error',
          title: 'Error creando encuentro',
          text: errorMsg,
        });
      },
    });
  }

  loadEncuentros() {
    if (!this.currentUserId) {
      console.error('No currentUserId available for loading encuentros');
      return;
    }
    console.log('Loading encuentros for userId:', this.currentUserId);
    this.http
      .get<any[]>(`http://localhost:3000/encuentro/resumen?creador=${this.currentUserId}`)
      .subscribe({
        next: (res) => {
          console.log('Encuentros received from API:', res);
          // normalizar fechas y asignar
          this.encuentros = res.map((r) => {
            const fechaObj = r.fecha ? new Date(r.fecha) : null;
            // construir etiqueta legible para la lista
            let displayWhen = '';
            if (fechaObj) {
              const now = new Date();
              const isToday =
                fechaObj.getFullYear() === now.getFullYear() &&
                fechaObj.getMonth() === now.getMonth() &&
                fechaObj.getDate() === now.getDate();
              const timeStr = fechaObj.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              if (isToday) {
                displayWhen = `Hoy • ${timeStr} • ${r.lugar || ''}`;
              } else {
                const dayMonth = fechaObj.toLocaleDateString([], {
                  day: 'numeric',
                  month: 'short',
                });
                displayWhen = `${dayMonth} • ${timeStr} • ${r.lugar || ''}`;
              }
            }
            return {
              id: r.idEncuentro || r.id,
              idCreador: r.idCreador,
              titulo: r.titulo,
              descripcion: r.descripcion,
              lugar: r.lugar,
              fecha: fechaObj,
              fechaCreacion: r.fechaCreacion ? new Date(r.fechaCreacion) : null,
              displayWhen,
              // Solo presupuesto y participantes
              idPresupuesto: r.idPresupuesto,
              presupuestoTotal: r.presupuestoTotal || 0,
              cantParticipantes: r.cantParticipantes || 0,
            };
          });
          console.log('Processed encuentros:', this.encuentros);
          this.computeMetrics();
        },
        error: (err) => {
          console.error('Error cargando encuentros', err);
        },
      });
  }

  computeMetrics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    this.encuentrosHoy = this.encuentros.filter(
      (e) => e.fecha && new Date(e.fecha) >= todayStart && new Date(e.fecha) < todayEnd
    ).length;

    this.encuentrosMes = this.encuentros.filter((e) => {
      if (!e.fecha) return false;
      const d = new Date(e.fecha);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    this.encuentrosPendientes = this.encuentros.filter(
      (e) => e.fecha && new Date(e.fecha) > now
    ).length;

    // upcoming: próximos encuentros (futuros) ordenados
    this.upcoming = this.encuentros
      .filter((e) => e.fecha && new Date(e.fecha) >= now)
      .sort((a, b) => {
        const dateA = a.fecha ? new Date(a.fecha).getTime() : 0;
        const dateB = b.fecha ? new Date(b.fecha).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 6);

    // calcular días con encuentros para el mes actualmente mostrado
    this.computeDaysWithEncuentros();
  }

  computeDaysWithEncuentros() {
    this.daysWithEncuentros.clear();
    if (this.currentYear === null || this.currentMonthIndex === null) return;
    for (const e of this.encuentros) {
      if (!e.fecha) continue;
      const d = new Date(e.fecha);
      if (d.getFullYear() === this.currentYear && d.getMonth() === this.currentMonthIndex) {
        this.daysWithEncuentros.add(d.getDate());
      }
    }
  }

  /**
   * Permite salir de un encuentro
   * Solo si no eres el creador
   */
  salirDeEncuentro(encuentro: any) {
    if (!this.currentUserId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario actual',
      });
      return;
    }

    // Verificar si el usuario es el creador
    if (encuentro.idCreador === this.currentUserId) {
      Swal.fire({
        icon: 'warning',
        title: 'No puedes salir',
        text: 'Eres el creador de este encuentro. Si deseas cancelarlo, debes eliminarlo.',
      });
      return;
    }

    // Confirmar antes de salir
    Swal.fire({
      title: '¿Salir del encuentro?',
      text: `¿Estás seguro de que quieres salir de "${encuentro.titulo}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.encuentroService.salirDelEncuentro(encuentro.id, this.currentUserId!).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Has salido del encuentro',
              text: response.message || 'Has dejado el encuentro correctamente',
              timer: 2000,
            });
            // Recargar la lista de encuentros
            this.loadEncuentros();
          },
          error: (err) => {
            console.error('Error saliendo del encuentro:', err);
            const errorMsg = err.error?.message || 'No se pudo salir del encuentro';
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: errorMsg,
            });
          },
        });
      }
    });
  }

  /**
   * Verifica si el usuario actual es el creador del encuentro
   */
  isCreador(encuentro: any): boolean {
    return encuentro.idCreador === this.currentUserId;
  }

  /**
   * Elimina un encuentro permanentemente
   * Solo el creador puede hacerlo
   */
  eliminarEncuentro(encuentro: any) {
    if (!this.currentUserId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario actual',
      });
      return;
    }

    // Verificar si el usuario es el creador
    if (!this.isCreador(encuentro)) {
      Swal.fire({
        icon: 'warning',
        title: 'No tienes permiso',
        text: 'Solo el creador puede eliminar este encuentro.',
      });
      return;
    }

    // Confirmar antes de eliminar (doble confirmación por ser una acción destructiva)
    Swal.fire({
      title: '⚠️ ¿Eliminar encuentro?',
      html: `
        <p>Estás a punto de eliminar permanentemente el encuentro:</p>
        <p style="font-weight: bold; color: #d33;">"${encuentro.titulo}"</p>
        <p style="color: #666; font-size: 0.9em;">Esta acción no se puede deshacer. Se eliminarán todos los datos asociados: participantes, presupuestos, aportes, etc.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6366f1',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Segunda confirmación
        Swal.fire({
          title: '¿Estás completamente seguro?',
          text: 'Esta es tu última oportunidad para cancelar',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, eliminar definitivamente',
          cancelButtonText: 'No, conservar',
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6366f1',
        }).then((secondResult) => {
          if (secondResult.isConfirmed) {
            this.encuentroService.deleteEncuentro(encuentro.id, this.currentUserId!).subscribe({
              next: (response) => {
                Swal.fire({
                  icon: 'success',
                  title: 'Encuentro eliminado',
                  text: response.message || 'El encuentro ha sido eliminado correctamente',
                  timer: 2000,
                });
                // Recargar la lista de encuentros
                this.loadEncuentros();
              },
              error: (err) => {
                console.error('Error eliminando el encuentro:', err);
                const errorMsg = err.error?.message || 'No se pudo eliminar el encuentro';
                Swal.fire({
                  icon: 'error',
                  title: 'Error',
                  text: errorMsg,
                });
              },
            });
          }
        });
      }
    });
  }
}
