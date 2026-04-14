import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

interface PocketDetails {
  id: number;
  nombre: string;
  saldoActual: number;
}

interface AporteEntry {
  id?: number;
  idBolsillo?: number;
  idUsuario?: number;
  monto: number;
  fechaAporte?: Date;
  usuario?: {
    nombre: string;
    apellido?: string;
  };
}

interface PocketSummary extends PocketDetails {
  totalContributions: number;
  myContribution: number;
  otherEntries: AporteEntry[];
}

interface StoredUser {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
}

interface ParticipanteSummary {
  totalParticipantes: number;
  aportePorPersona: number;
}

@Component({
  selector: 'app-contributions',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './contributions.html',
  styleUrl: './contributions.css',
})
export default class Contributions implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  encuentroId: string | null = null;
  currentUser: StoredUser | null = null;
  pockets: PocketDetails[] = [];
  aportes: AporteEntry[] = [];
  pocketForms = new Map<number, FormGroup>();
  submitting = false;
  loading = true;
  budget: any = null;
  pocketSummaries: PocketSummary[] = [];
  submittingPocketId: number | null = null;
  participantes: ParticipanteSummary = {
    totalParticipantes: 0,
    aportePorPersona: 0,
  };

  get hasBudget(): boolean {
    return !!this.budget;
  }

  get hasPockets(): boolean {
    return this.pockets.length > 0;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  get totalCollected(): number {
    return this.pocketSummaries.reduce((acc, pocket) => acc + pocket.totalContributions, 0);
  }

  get myTotalContribution(): number {
    if (!this.currentUser) {
      return 0;
    }
    return this.pocketSummaries.reduce((acc, pocket) => acc + pocket.myContribution, 0);
  }

  ngOnInit() {
    // Obtener el ID del encuentro de los parámetros de la ruta
    this.encuentroId = this.route.snapshot.paramMap.get('id');

    if (this.encuentroId) {
      this.loadCurrentUser();
      this.loadBudget();
      this.loadParticipantes();
      this.loadPockets();
      this.loadAportes();
    } else {
      this.loading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Sin encuentro',
        text: 'No se especificó un encuentro para los aportes',
      });
    }
  }

  private loadCurrentUser(): void {
    const raw = localStorage.getItem('user'); // Cambiar de 'currentUser' a 'user'
    if (raw) {
      try {
        this.currentUser = JSON.parse(raw) as StoredUser;
        console.log('Usuario cargado desde localStorage:', this.currentUser);
      } catch (error) {
        console.error('Error al parsear el usuario:', error);
        this.currentUser = null;
      }
    } else {
      console.warn('No se encontró user en localStorage');
    }
  }

  private loadParticipantes(): void {
    if (!this.encuentroId) return;

    this.http
      .get<any[]>(`http://localhost:3000/participantes-encuentro?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (participantes) => {
          this.participantes.totalParticipantes = participantes.length;
          // Calcular aporte por persona cuando tengamos el presupuesto
          if (this.budget && this.participantes.totalParticipantes > 0) {
            this.participantes.aportePorPersona =
              this.budget.monto / this.participantes.totalParticipantes;
          }
          console.log('Participantes cargados:', this.participantes);
        },
        error: (err) => {
          console.error('Error cargando participantes', err);
        },
      });
  }

  private loadBudget(): void {
    if (!this.encuentroId) return;

    this.http
      .get<any>(`http://localhost:3000/presupuesto?encuentro=${this.encuentroId}`)
      .subscribe({
        next: (presupuesto) => {
          if (presupuesto) {
            this.budget = {
              id: presupuesto.id,
              nombre: 'Presupuesto del Encuentro',
              monto: presupuesto.presupuestoTotal || 0,
            };
            // Calcular aporte por persona si ya tenemos participantes
            if (this.participantes.totalParticipantes > 0) {
              this.participantes.aportePorPersona =
                this.budget.monto / this.participantes.totalParticipantes;
            }
            console.log('Presupuesto cargado:', this.budget);
          }
        },
        error: (err) => {
          console.error('Error cargando presupuesto', err);
        },
      });
  }

  private loadPockets(): void {
    if (!this.encuentroId) return;

    this.http.get<any[]>(`http://localhost:3000/bolsillo?encuentro=${this.encuentroId}`).subscribe({
      next: (bolsillos) => {
        this.pockets = bolsillos.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          saldoActual: b.saldoActual,
        }));
      },
      error: (err) => {
        console.error('Error cargando bolsillos', err);
      },
    });
  }

  private loadAportes(): void {
    if (!this.encuentroId) return;

    this.http.get<any[]>(`http://localhost:3000/aporte?encuentro=${this.encuentroId}`).subscribe({
      next: (aportes) => {
        this.aportes = aportes.map((a) => ({
          id: a.id,
          idBolsillo: a.idBolsillo,
          idUsuario: a.idUsuario,
          monto: a.monto,
          fechaAporte: a.fechaAporte,
          usuario: a.usuario,
        }));

        // Inicializar formularios para cada bolsillo
        this.pockets.forEach((pocket) => {
          this.ensureFormForPocket(pocket.id);
        });

        // Calcular summaries
        this.calculatePocketSummaries();

        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando aportes', err);
        this.loading = false;
      },
    });
  }

  private calculatePocketSummaries(): void {
    this.pocketSummaries = this.pockets.map((pocket) => {
      const pocketAportes = this.aportes.filter((a) => a.idBolsillo === pocket.id);
      const totalContributions = pocketAportes.reduce((sum, a) => sum + a.monto, 0);
      const myContribution = pocketAportes
        .filter((a) => a.idUsuario === this.currentUser?.id)
        .reduce((sum, a) => sum + a.monto, 0);
      const otherEntries = pocketAportes.filter((a) => a.idUsuario !== this.currentUser?.id);

      return {
        ...pocket,
        totalContributions,
        myContribution,
        otherEntries,
      };
    });
  }

  getPocketSummaries(): PocketSummary[] {
    return this.pockets.map((pocket) => {
      const pocketAportes = this.aportes.filter((a) => a.idBolsillo === pocket.id);
      const totalContributions = pocketAportes.reduce((sum, a) => sum + a.monto, 0);
      const myContribution = pocketAportes
        .filter((a) => a.idUsuario === this.currentUser?.id)
        .reduce((sum, a) => sum + a.monto, 0);
      const otherEntries = pocketAportes.filter((a) => a.idUsuario !== this.currentUser?.id);

      return {
        ...pocket,
        totalContributions,
        myContribution,
        otherEntries,
      };
    });
  }

  trackPocketById(index: number, pocket: PocketSummary): number {
    return pocket.id ?? index;
  }

  private ensureFormForPocket(pocketId: number): void {
    if (!this.pocketForms.has(pocketId)) {
      const myAporte = this.aportes.find(
        (a) => a.idBolsillo === pocketId && a.idUsuario === this.currentUser?.id
      );
      this.pocketForms.set(
        pocketId,
        this.fb.group({
          amount: [myAporte?.monto ?? null, [Validators.required, Validators.min(0.01)]],
        })
      );
    }
  }

  getPocketForm(pocketId: number): FormGroup | null {
    return this.pocketForms.get(pocketId) ?? null;
  }

  async confirmContribution(pocketId: number): Promise<void> {
    console.log('confirmContribution llamado para pocketId:', pocketId);
    console.log('encuentroId:', this.encuentroId);
    console.log('currentUser:', this.currentUser);
    console.log('isLoggedIn:', this.isLoggedIn);

    if (!this.encuentroId) {
      await Swal.fire({
        title: 'Error',
        text: 'No se ha especificado un encuentro',
        icon: 'error',
      });
      return;
    }

    if (!this.currentUser) {
      console.warn('Usuario no encontrado en localStorage');
      await Swal.fire({
        title: 'Necesitas iniciar sesión',
        text: 'Inicia sesión para registrar o actualizar tu aporte.',
        icon: 'info',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const form = this.getPocketForm(pocketId);
    if (!form || form.invalid) {
      form?.markAllAsTouched();
      await Swal.fire({
        title: 'Validación',
        text: 'Por favor ingresa un monto válido mayor a 0',
        icon: 'warning',
      });
      return;
    }

    const monto = form.value.amount;
    const pocket = this.pockets.find((p) => p.id === pocketId);

    if (!pocket) {
      await Swal.fire({
        title: 'Error',
        text: 'No se encontró el bolsillo seleccionado',
        icon: 'error',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirmar aporte',
      text: `Registrarás $${monto.toLocaleString('es-CO')} en "${
        pocket.nombre
      }". ¿Deseas continuar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    this.submittingPocketId = pocketId;

    // Verificar si ya existe un aporte del usuario para este bolsillo
    const existingAporte = this.aportes.find(
      (a) => a.idBolsillo === pocketId && a.idUsuario === this.currentUser?.id
    );

    if (existingAporte && existingAporte.id) {
      // Actualizar aporte existente
      this.http.patch(`http://localhost:3000/aporte/${existingAporte.id}`, { monto }).subscribe({
        next: () => {
          this.submittingPocketId = null;
          Swal.fire({
            icon: 'success',
            title: '¡Aporte actualizado!',
            text: 'Tu aporte ha sido actualizado correctamente',
            timer: 2000,
          });
          this.loadAportes();
        },
        error: (err) => {
          this.submittingPocketId = null;
          console.error('Error actualizando aporte', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar el aporte',
          });
        },
      });
    } else {
      // Crear nuevo aporte
      const nuevoAporte = {
        idBolsillo: pocketId,
        idEncuentro: Number(this.encuentroId),
        idUsuario: this.currentUser.id,
        monto,
      };

      this.http.post('http://localhost:3000/aporte', nuevoAporte).subscribe({
        next: () => {
          this.submittingPocketId = null;
          Swal.fire({
            icon: 'success',
            title: '¡Aporte registrado!',
            text: 'Tu aporte ha sido registrado correctamente',
            timer: 2000,
          });
          // Recargar tanto aportes como bolsillos para actualizar saldos
          this.loadAportes();
          this.loadPockets();
        },
        error: (err) => {
          this.submittingPocketId = null;
          this.submitting = false;
          console.error('Error creando aporte', err);
          const errorMsg = err.error?.message || 'No se pudo registrar el aporte';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMsg,
          });
        },
      });
    }
  }

  goToBudgets(): void {
    this.router.navigate(['/budgets', this.encuentroId]);
  }

  goToPockets(): void {
    this.router.navigate(['/pockets', this.encuentroId]);
  }

  goToCosts(): void {
    this.router.navigate(['/costs', this.encuentroId]);
  }

  goToEncuentro(): void {
    this.router.navigate(['/chat-detail', this.encuentroId]);
  }
}
