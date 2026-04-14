import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { EncuentroService } from '../../../services/encuentro.service';

@Component({
  selector: 'app-chat-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-detail.html',
  styleUrl: './chat-detail.css',
})
export class ChatDetail implements OnInit {
  http = inject(HttpClient);
  encuentroService = inject(EncuentroService);
  encuentroId: string | null = null;
  encuentro: any = null;
  messageText: string = '';
  showAddFriends: boolean = false;
  showEncuentroDetails: boolean = false;
  showParticipantes: boolean = false;
  currentUserId: number | null = null;
  friends: Array<any> = [];
  loadingFriends: boolean = false;
  participantes: Array<any> = [];
  // Variables para edición
  isEditing: boolean = false;
  encuentroEditando: {
    titulo: string;
    descripcion: string;
    lugar: string;
    fecha: string;
  } = {
    titulo: '',
    descripcion: '',
    lugar: '',
    fecha: ''
  };
  participantesDetalle: Array<{
    idEncuentro: number;
    tituloEncuentro: string;
    fecha: Date;
    idUsuario: number;
    nombreCompleto: string;
    rol: string;
  }> = [];
  participantesAportes: Array<{
    idEncuentro: number;
    nombreEncuentro: string;
    idUsuario: number;
    nombreUsuario: string;
    apellidoUsuario: string;
    nombreCompleto: string;
    rol: string;
    totalAportes: number;
  }> = [];

  constructor(private route: ActivatedRoute, private router: Router) {
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
    // Obtener el ID del encuentro de los parámetros de la ruta
    this.encuentroId = this.route.snapshot.paramMap.get('id');

    if (this.encuentroId) {
      this.loadEncuentro();
      this.loadParticipantes();
    } else {
      // Si no hay ID, redirigir a chats
      this.router.navigate(['/chats']);
    }
  }

  loadEncuentro() {
    if (!this.encuentroId) return;

    // Cargar el encuentro desde el backend
    this.http.get<any>(`http://localhost:3000/encuentro/${this.encuentroId}`).subscribe({
      next: (encuentro) => {
        if (encuentro) {
          this.encuentro = encuentro;
        } else {
          // Si no se encuentra el encuentro, redirigir
          this.router.navigate(['/chats']);
        }
      },
      error: (err) => {
        console.error('Error cargando encuentro', err);
        this.router.navigate(['/chats']);
      },
    });
  }

  loadParticipantes() {
    if (!this.encuentroId) return;

    // Cargar participantes básicos (para compatibilidad)
    this.http
      .get<any[]>(`http://localhost:3000/participantes-encuentro?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (participantes) => {
          this.participantes = participantes;
        },
        error: (err) => {
          console.error('Error cargando participantes', err);
        },
      });
    
    // Cargar participantes desde la vista con información detallada
    this.http
      .get<any[]>(`http://localhost:3000/participantes-encuentro/vista/detalle?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (participantes) => {
          this.participantesDetalle = participantes;
          console.log('Participantes detalle:', this.participantesDetalle);
        },
        error: (err) => {
          console.error('Error cargando participantes detalle', err);
        },
      });
    
    // Cargar participantes con aportes desde la vista VISTAPARTICIPANTESAPORTES
    this.http
      .get<any[]>(`http://localhost:3000/participantes-encuentro/aportes/resumen?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (aportes) => {
          this.participantesAportes = aportes;
          console.log('Participantes con aportes:', this.participantesAportes);
        },
        error: (err) => {
          console.error('Error cargando aportes de participantes', err);
        },
      });
  }

  sendMessage() {
    // Simulación: no se envía realmente el mensaje
    if (this.messageText.trim()) {
      console.log('Mensaje simulado:', this.messageText);
      this.messageText = '';
    }
  }

  goBack() {
    this.router.navigate(['/chats']);
  }

  toggleAddFriends() {
    this.showAddFriends = !this.showAddFriends;

    if (this.showAddFriends && this.friends.length === 0) {
      this.loadFriends();
    }
  }

  loadFriends() {
    if (!this.currentUserId) {
      console.warn('No hay usuario logueado');
      return;
    }

    this.loadingFriends = true;
    this.http
      .get<any>(
        `http://localhost:3000/users/friends/${this.currentUserId}?userId=${this.currentUserId}`
      )
      .subscribe({
        next: (response) => {
          this.loadingFriends = false;
          console.log('Respuesta de amigos:', response); // Debug
          if (response.success && response.friends) {
            // Normalizar nombres de propiedades (Oracle devuelve en mayúsculas o minúsculas según el alias)
            this.friends = response.friends.map((friend: any) => {
              const normalizedFriend = {
                id: friend.id || friend.ID || friend.ID_USUARIO,
                nombre: friend.nombre || friend.NOMBRE,
                apellido: friend.apellido || friend.APELLIDO,
                email: friend.email || friend.EMAIL,
                imagenPerfil: friend.imagenPerfil || friend.IMAGEN_PERFIL || friend.IMAGENPERFIL,
                isParticipante: this.participantes.some(
                  (p) => p.idUsuario === (friend.id || friend.ID || friend.ID_USUARIO)
                ),
              };
              console.log('Amigo normalizado:', normalizedFriend); // Debug
              return normalizedFriend;
            });
            console.log('Lista final de amigos:', this.friends); // Debug
          }
        },
        error: (err) => {
          this.loadingFriends = false;
          console.error('Error cargando amigos', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los amigos',
          });
        },
      });
  }

  addParticipante(friend: any) {
    if (!this.encuentroId) return;

    const payload = {
      idEncuentro: Number(this.encuentroId),
      idUsuario: friend.id,
      idSolicitante: this.currentUserId, // Usuario que está haciendo la solicitud
      rol: 'participante',
    };

    this.http.post('http://localhost:3000/participantes-encuentro', payload).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: '¡Agregado!',
          text: `${friend.nombre} ha sido agregado al encuentro`,
          timer: 2000,
          showConfirmButton: false,
        });

        // Marcar como participante en la lista
        friend.isParticipante = true;

        // Recargar participantes
        this.loadParticipantes();
      },
      error: (err) => {
        console.error('Error agregando participante', err);
        const errorMsg = err.error?.message || 'No se pudo agregar al participante';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
        });
      },
    });
  }

  toggleEncuentroDetails() {
    this.showEncuentroDetails = !this.showEncuentroDetails;
  }

  toggleParticipantes() {
    this.showParticipantes = !this.showParticipantes;
  }

  goToBudgets() {
    this.router.navigate(['/budgets', this.encuentroId]);
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getAporteByUsuario(idUsuario: number): number | null {
    const participante = this.participantesAportes.find(p => p.idUsuario === idUsuario);
    return participante ? participante.totalAportes : null;
  }

  /**
   * Verifica si el usuario actual es el creador del encuentro
   */
  isCreador(): boolean {
    return this.encuentro?.idCreador === this.currentUserId;
  }

  /**
   * Activa el modo de edición del encuentro
   */
  activarEdicion() {
    if (!this.isCreador()) {
      Swal.fire({
        icon: 'warning',
        title: 'No tienes permiso',
        text: 'Solo el creador puede editar este encuentro.',
      });
      return;
    }

    // Copiar los datos actuales al formulario de edición
    this.encuentroEditando = {
      titulo: this.encuentro?.titulo || '',
      descripcion: this.encuentro?.descripcion || '',
      lugar: this.encuentro?.lugar || '',
      fecha: this.encuentro?.fecha 
        ? new Date(this.encuentro.fecha).toISOString().slice(0, 16) 
        : ''
    };
    this.isEditing = true;
  }

  /**
   * Cancela la edición y restaura los valores originales
   */
  cancelarEdicion() {
    this.isEditing = false;
    this.encuentroEditando = {
      titulo: '',
      descripcion: '',
      lugar: '',
      fecha: ''
    };
  }

  /**
   * Guarda los cambios del encuentro editado
   */
  guardarEdicion() {
    if (!this.currentUserId || !this.encuentroId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario o encuentro actual',
      });
      return;
    }

    // Validaciones
    if (!this.encuentroEditando.titulo?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El título es obligatorio',
      });
      return;
    }

    if (!this.encuentroEditando.lugar?.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El lugar es obligatorio',
      });
      return;
    }

    if (!this.encuentroEditando.fecha) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'La fecha es obligatoria',
      });
      return;
    }

    // Validar que la fecha no sea pasada
    const selectedDate = new Date(this.encuentroEditando.fecha);
    if (selectedDate.getTime() < Date.now()) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha inválida',
        text: 'La fecha del encuentro no puede ser en el pasado',
      });
      return;
    }

    // Preparar datos para enviar
    const dataToUpdate = {
      titulo: this.encuentroEditando.titulo,
      descripcion: this.encuentroEditando.descripcion,
      lugar: this.encuentroEditando.lugar,
      fecha: new Date(this.encuentroEditando.fecha)
    };

    // Enviar al backend
    this.encuentroService.updateEncuentro(
      Number(this.encuentroId), 
      dataToUpdate, 
      this.currentUserId
    ).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Encuentro actualizado',
          text: response.message || 'Los cambios han sido guardados correctamente',
          timer: 2000,
        });
        // Actualizar el encuentro local con los nuevos datos
        this.encuentro = { ...this.encuentro, ...response.encuentro };
        this.isEditing = false;
        // Recargar el encuentro para tener los datos actualizados
        this.loadEncuentro();
      },
      error: (err) => {
        console.error('Error actualizando el encuentro:', err);
        const errorMsg = err.error?.message || 'No se pudo actualizar el encuentro';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
        });
      },
    });
  }

  /**
   * Permite salir de un encuentro
   * Solo si no eres el creador
   */
  salirDelEncuentro() {
    if (!this.currentUserId || !this.encuentroId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario o encuentro actual',
      });
      return;
    }

    // Verificar si el usuario es el creador
    if (this.isCreador()) {
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
      text: `¿Estás seguro de que quieres salir de "${this.encuentro?.titulo}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.encuentroService.salirDelEncuentro(Number(this.encuentroId), this.currentUserId!).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Has salido del encuentro',
              text: response.message || 'Has dejado el encuentro correctamente',
              timer: 2000,
            }).then(() => {
              // Redirigir a la lista de chats después de salir
              this.router.navigate(['/chats']);
            });
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
   * Elimina un encuentro permanentemente
   * Solo el creador puede hacerlo
   */
  eliminarEncuentro() {
    if (!this.currentUserId || !this.encuentroId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario o encuentro actual',
      });
      return;
    }

    // Verificar si el usuario es el creador
    if (!this.isCreador()) {
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
        <p style="font-weight: bold; color: #d33;">"${this.encuentro?.titulo}"</p>
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
            this.encuentroService.deleteEncuentro(Number(this.encuentroId), this.currentUserId!).subscribe({
              next: (response) => {
                Swal.fire({
                  icon: 'success',
                  title: 'Encuentro eliminado',
                  text: response.message || 'El encuentro ha sido eliminado correctamente',
                  timer: 2000,
                }).then(() => {
                  // Redirigir a la lista de chats después de eliminar
                  this.router.navigate(['/chats']);
                });
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
