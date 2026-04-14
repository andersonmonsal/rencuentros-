import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { BolsilloService } from '../../../services/bolsillo.service';

interface PocketDetails {
  id?: number;
  nombre: string;
  saldoActual: number;
  idPresupuesto?: number;
  idEncuentro?: number;
}

@Component({
  selector: 'app-pockets',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './pockets.html',
  styleUrl: './pockets.css',
})
export class Pockets implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly bolsilloService = inject(BolsilloService);

  encuentroId: string | null = null;
  presupuestoId: number | null = null;
  pockets: PocketDetails[] = [];
  submitting = false;
  loading = true;
  currentUserId: number | null = null;

  pocketForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
  });

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
    // Obtener el ID del encuentro de los parámetros de la ruta
    this.encuentroId = this.route.snapshot.paramMap.get('id');

    if (this.encuentroId) {
      this.loadPresupuesto();
      this.loadPockets();
    } else {
      this.loading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Sin encuentro',
        text: 'No se especificó un encuentro para los bolsillos',
      });
    }
  }

  loadPresupuesto() {
    if (!this.encuentroId) return;

    this.http
      .get<any>(`http://localhost:3000/presupuesto?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (presupuesto) => {
          if (presupuesto) {
            this.presupuestoId = presupuesto.id;
          }
        },
        error: (err) => {
          console.error('Error cargando presupuesto', err);
        },
      });
  }

  loadPockets() {
    if (!this.encuentroId) return;

    this.loading = true;
    this.http.get<any[]>(`http://localhost:3000/bolsillo?encuentro=${this.encuentroId}`).subscribe({
      next: (bolsillos) => {
        this.loading = false;
        this.pockets = bolsillos.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          saldoActual: b.saldoActual || 0,
          idPresupuesto: b.idPresupuesto,
          idEncuentro: b.idEncuentro,
        }));
      },
      error: (err) => {
        this.loading = false;
        console.error('Error cargando bolsillos', err);
      },
    });
  }

  get nombreControl() {
    return this.pocketForm.get('nombre');
  }

  onCreatePocket(): void {
    if (!this.encuentroId) {
      this.router.navigate(['/budgets', this.encuentroId]);
      return;
    }

    if (this.submitting || this.pocketForm.invalid) {
      this.pocketForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const nombre = (this.pocketForm.value.nombre ?? '').trim();

    const payload = {
      idEncuentro: Number(this.encuentroId),
      idPresupuesto: this.presupuestoId || undefined,
      nombre,
      saldoActual: 0,
    };

    this.http.post<any>('http://localhost:3000/bolsillo', payload).subscribe({
      next: (bolsillo) => {
        this.submitting = false;
        this.pockets = [
          ...this.pockets,
          {
            id: bolsillo.id,
            nombre: bolsillo.nombre,
            saldoActual: bolsillo.saldoActual || 0,
            idPresupuesto: bolsillo.idPresupuesto,
            idEncuentro: bolsillo.idEncuentro,
          },
        ];

        this.pocketForm.reset();
        this.pocketForm.markAsPristine();
        this.pocketForm.markAsUntouched();

        Swal.fire({
          icon: 'success',
          title: '¡Bolsillo creado!',
          text: 'El bolsillo ha sido creado exitosamente',
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.submitting = false;
        console.error('Error creando bolsillo', err);
        const errorMsg = err.error?.message || 'Error al crear el bolsillo';

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMsg,
        });
      },
    });
  }

  goToBudgets(): void {
    this.router.navigate(['/budgets', this.encuentroId]);
  }

  goToContributions(): void {
    this.router.navigate(['/contributions', this.encuentroId]);
  }

  goToCosts(): void {
    this.router.navigate(['/costs', this.encuentroId]);
  }

  goToEncuentro(): void {
    this.router.navigate(['/chat-detail', this.encuentroId]);
  }

  trackPocketById(index: number, pocket: PocketDetails): string {
    return pocket.id?.toString() ?? `${index}`;
  }

  /**
   * Elimina un bolsillo
   */
  eliminarBolsillo(pocket: PocketDetails): void {
    if (!this.currentUserId || !pocket.id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo identificar el usuario o bolsillo actual',
      });
      return;
    }

    Swal.fire({
      title: '¿Eliminar bolsillo?',
      html: `
        <p>¿Estás seguro de que quieres eliminar el bolsillo "${pocket.nombre}"?</p>
        <p style="color: #d32f2f; font-size: 0.9em; margin-top: 8px;">No se puede eliminar si tiene aportes asociados.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.bolsilloService.eliminarBolsillo(pocket.id!, this.currentUserId!).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Bolsillo eliminado',
              text: response.message || 'El bolsillo ha sido eliminado correctamente',
              timer: 1500,
              showConfirmButton: false,
            });

            // Actualizar la lista localmente
            this.pockets = this.pockets.filter(p => p.id !== pocket.id);
          },
          error: (err) => {
            console.error('Error eliminando bolsillo:', err);
            const errorMsg = err.error?.message || 'No se pudo eliminar el bolsillo';
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
}
