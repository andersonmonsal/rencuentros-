import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

interface BudgetDetails {
  nombre: string;
  monto: number;
}

interface PocketDetails {
  id: string;
  nombre: string;
  saldoActual: number;
  gastos: number;
}

interface StoredPocketState {
  budgetName: string;
  budgetAmount: number;
  pockets: PocketDetails[];
}

interface ContributionEntry {
  amount: number;
}

interface PocketContributionState {
  pocketId: string;
  pocketName: string;
  entries: ContributionEntry[];
}

interface PocketCostState {
  pocketId: string;
  pocketName: string;
  itemName: string;
  amount: number;
  recordedById: number;
  recordedByName: string;
  updatedAt: string;
}

interface PocketCostSummary extends PocketDetails {
  totalContributions: number;
  contributorsCount: number;
  costAmount: number;
  costName: string | null;
  lastUpdate: string | null;
  recordedBy: string | null;
  balance: number;
}

interface StoredUser {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
}

type ContributionsStorage = Record<string, PocketContributionState[]>;
type CostsStorage = Record<string, PocketCostState[]>;

@Component({
  selector: 'app-costs',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './costs.html',
  styleUrl: './costs.css',
})
export class Costs implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly budgetStorageKey = 'encuentros:selected-budget';
  private readonly pocketsStorageKey = 'encuentros:pockets';
  private readonly contributionsStorageKey = 'encuentros:contributions';
  private readonly costsStorageKey = 'encuentros:costs';

  encuentroId: string | null = null;
  budget: BudgetDetails | null = null;
  pockets: PocketDetails[] = [];
  pocketSummaries: PocketCostSummary[] = [];
  currentUser: StoredUser | null = null;

  private contributionsState: PocketContributionState[] = [];
  private costState: PocketCostState[] = [];
  private pocketForms = new Map<string, FormGroup>();
  submittingPocketId: string | null = null;

  constructor() {
    this.loadBudget();
    this.loadCurrentUser();
    this.loadPockets();
    this.loadContributions();
    this.loadCosts();
    this.buildPocketSummaries();
  }

  ngOnInit(): void {
    this.encuentroId = this.route.snapshot.paramMap.get('id');
  }

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

  get totalSpent(): number {
    return this.pocketSummaries.reduce((acc, pocket) => acc + pocket.costAmount, 0);
  }

  get remainingBalance(): number {
    return this.totalCollected - this.totalSpent;
  }

  getPocketForm(pocketId: string): FormGroup {
    let form = this.pocketForms.get(pocketId);
    if (!form) {
      const stored = this.costState.find((entry) => entry.pocketId === pocketId);
      form = this.fb.group({
        nombre: [stored?.itemName ?? '', [Validators.required, Validators.maxLength(200)]],
        amount: [stored?.amount ?? null, [Validators.required, Validators.min(0.01)]],
      });
      this.pocketForms.set(pocketId, form);
    }
    return form;
  }

  trackPocketById(index: number, pocket: PocketCostSummary): string {
    return pocket.id ?? `${index}`;
  }

  async confirmCost(pocketId: string): Promise<void> {
    if (!this.hasBudget) {
      this.router.navigate(['/budgets']);
      return;
    }

    if (!this.isLoggedIn) {
      await Swal.fire({
        title: 'Necesitas iniciar sesión',
        text: 'Inicia sesión para registrar o actualizar un gasto.',
        icon: 'info',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const form = this.getPocketForm(pocketId);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const rawNombre = (form.value.nombre ?? '').trim();
    const rawAmount = form.value.amount;
    const amount = this.parseAmount(rawAmount);

    if (!rawNombre) {
      form.get('nombre')?.setErrors({ required: true });
      return;
    }

    if (amount <= 0) {
      form.get('amount')?.setErrors({ min: true });
      return;
    }

    const pocket = this.pockets.find((item) => item.id === pocketId);
    if (!pocket) {
      await Swal.fire({
        title: 'Bolsillo no encontrado',
        text: 'No pudimos identificar el bolsillo seleccionado. Intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    const formattedAmount = this.formatAmount(amount);
    const result = await Swal.fire({
      title: 'Confirmar gasto',
      html: `Registrarás <strong>${formattedAmount}</strong> en "${pocket.nombre}" como "${rawNombre}". ¿Deseas continuar?`,
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
    this.updateCostState(pocketId, rawNombre, amount);
    this.persistCosts();
    this.loadPockets();
    this.buildPocketSummaries();
    form.patchValue({ nombre: rawNombre, amount }, { emitEvent: false });
    form.markAsPristine();
    form.markAsUntouched();
    this.submittingPocketId = null;

    await Swal.fire({
      title: 'Gasto registrado',
      text: 'Actualizamos el gasto del bolsillo y el saldo disponible.',
      icon: 'success',
      confirmButtonColor: '#2563eb',
    });
  }

  goToBudgets(): void {
    this.router.navigate(['/budgets', this.encuentroId]);
  }

  goToPockets(): void {
    this.router.navigate(['/pockets', this.encuentroId]);
  }

  goToContributions(): void {
    this.router.navigate(['/contributions', this.encuentroId]);
  }

  goToEncuentro(): void {
    this.router.navigate(['/chat-detail', this.encuentroId]);
  }

  private parseAmount(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '.');
      return Number.parseFloat(normalized);
    }
    return 0;
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private loadBudget(): void {
    try {
      const raw = localStorage.getItem(this.budgetStorageKey);
      if (!raw) {
        return;
      }
      const stored = JSON.parse(raw) as BudgetDetails | null;
      if (stored && typeof stored.nombre === 'string' && typeof stored.monto === 'number') {
        this.budget = stored;
      }
    } catch (error) {
      console.warn('No se pudo recuperar el presupuesto seleccionado', error);
    }
  }

  private loadCurrentUser(): void {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) {
        return;
      }
      const stored = JSON.parse(raw) as StoredUser | null;
      if (stored && typeof stored.id === 'number' && typeof stored.nombre === 'string') {
        this.currentUser = stored;
      }
    } catch (error) {
      console.warn('No se pudo recuperar la sesión de usuario', error);
    }
  }

  private loadPockets(): void {
    if (!this.budget) {
      this.pockets = [];
      return;
    }

    try {
      const raw = localStorage.getItem(this.pocketsStorageKey);
      if (!raw) {
        this.pockets = [];
        return;
      }

      const stored = JSON.parse(raw) as StoredPocketState | null;
      if (!stored) {
        this.pockets = [];
        return;
      }

      if (stored.budgetName === this.budget.nombre && typeof stored.budgetAmount === 'number') {
        this.pockets = Array.isArray(stored.pockets) ? stored.pockets : [];
      } else {
        this.pockets = [];
      }
    } catch (error) {
      console.warn('No se pudieron recuperar los bolsillos almacenados', error);
      this.pockets = [];
    }
  }

  private loadContributions(): void {
    if (!this.budget) {
      this.contributionsState = [];
      return;
    }

    const storageKey = this.buildBudgetKey();
    if (!storageKey) {
      this.contributionsState = [];
      return;
    }

    try {
      const raw = localStorage.getItem(this.contributionsStorageKey);
      if (!raw) {
        this.contributionsState = [];
        return;
      }

      const stored = JSON.parse(raw) as ContributionsStorage | null;
      if (!stored || typeof stored !== 'object') {
        this.contributionsState = [];
        return;
      }

      const entries = stored[storageKey];
      if (Array.isArray(entries)) {
        this.contributionsState = entries;
      } else {
        this.contributionsState = [];
      }
    } catch (error) {
      console.warn('No se pudieron recuperar los aportes almacenados', error);
      this.contributionsState = [];
    }
  }

  private loadCosts(): void {
    if (!this.budget) {
      this.costState = [];
      return;
    }

    const storageKey = this.buildBudgetKey();
    if (!storageKey) {
      this.costState = [];
      return;
    }

    try {
      const raw = localStorage.getItem(this.costsStorageKey);
      if (!raw) {
        this.costState = [];
        return;
      }

      const stored = JSON.parse(raw) as CostsStorage | null;
      if (!stored || typeof stored !== 'object') {
        this.costState = [];
        return;
      }

      const entries = stored[storageKey];
      if (Array.isArray(entries)) {
        this.costState = entries;
      } else {
        this.costState = [];
      }
    } catch (error) {
      console.warn('No se pudieron recuperar los gastos almacenados', error);
      this.costState = [];
    }
  }

  private persistCosts(): void {
    const storageKey = this.buildBudgetKey();
    if (!storageKey) {
      return;
    }

    try {
      const raw = localStorage.getItem(this.costsStorageKey);
      const stored = raw ? (JSON.parse(raw) as CostsStorage) : {};
      stored[storageKey] = this.costState;
      localStorage.setItem(this.costsStorageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('No se pudieron guardar los gastos', error);
    }
  }

  private buildPocketSummaries(): void {
    if (!this.hasBudget) {
      this.pocketSummaries = [];
      this.pocketForms.clear();
      return;
    }

    const validPocketIds = new Set(this.pockets.map((pocket) => pocket.id));

    this.contributionsState = this.contributionsState.filter((state) =>
      validPocketIds.has(state.pocketId)
    );
    this.costState = this.costState.filter((state) => validPocketIds.has(state.pocketId));

    this.pocketSummaries = this.pockets.map((pocket) => {
      const contributions = this.getContributionsTotalForPocket(pocket.id);
      const contributorsCount = this.getContributorsCount(pocket.id);
      const cost = this.costState.find((entry) => entry.pocketId === pocket.id) ?? null;

      this.ensureFormForPocket(pocket.id, cost?.itemName ?? null, cost?.amount ?? null);

      return {
        ...pocket,
        totalContributions: contributions,
        contributorsCount,
        costAmount: cost?.amount ?? 0,
        costName: cost?.itemName ?? null,
        lastUpdate: cost?.updatedAt ?? null,
        recordedBy: cost?.recordedByName ?? null,
        balance: contributions - (cost?.amount ?? 0),
      } satisfies PocketCostSummary;
    });

    this.syncPocketForms(validPocketIds);
  }

  private ensureFormForPocket(
    pocketId: string,
    nombre: string | null,
    amount: number | null
  ): void {
    const form = this.pocketForms.get(pocketId);
    if (!form) {
      const group = this.fb.group({
        nombre: [nombre ?? '', [Validators.required, Validators.maxLength(200)]],
        amount: [amount ?? null, [Validators.required, Validators.min(0.01)]],
      });
      this.pocketForms.set(pocketId, group);
      return;
    }

    const normalizedNombre = nombre ?? '';
    const normalizedAmount = amount ?? null;
    if (form.value.nombre !== normalizedNombre) {
      form.patchValue({ nombre: normalizedNombre }, { emitEvent: false });
    }

    const currentAmount = this.parseAmount(form.value.amount);
    if (
      normalizedAmount === null &&
      form.value.amount !== null &&
      form.value.amount !== undefined
    ) {
      form.reset({ nombre: normalizedNombre, amount: null }, { emitEvent: false });
      form.markAsPristine();
      form.markAsUntouched();
      return;
    }

    if (normalizedAmount !== null && normalizedAmount !== currentAmount) {
      form.patchValue({ amount: normalizedAmount }, { emitEvent: false });
      form.markAsPristine();
      form.markAsUntouched();
    }
  }

  private syncPocketForms(validPocketIds: Set<string>): void {
    for (const pocketId of Array.from(this.pocketForms.keys())) {
      if (!validPocketIds.has(pocketId)) {
        this.pocketForms.delete(pocketId);
      }
    }
  }

  private updateCostState(pocketId: string, itemName: string, amount: number): void {
    if (!this.currentUser) {
      return;
    }

    const pocket = this.pockets.find((entry) => entry.id === pocketId);
    if (!pocket) {
      return;
    }

    const timestamp = new Date().toISOString();
    let pocketState = this.costState.find((entry) => entry.pocketId === pocketId);

    if (!pocketState) {
      pocketState = {
        pocketId,
        pocketName: pocket.nombre,
        itemName,
        amount,
        recordedById: this.currentUser.id,
        recordedByName: this.currentUser.nombre,
        updatedAt: timestamp,
      } satisfies PocketCostState;
      this.costState = [...this.costState, pocketState];
    } else {
      pocketState.itemName = itemName;
      pocketState.amount = amount;
      pocketState.recordedById = this.currentUser.id;
      pocketState.recordedByName = this.currentUser.nombre;
      pocketState.updatedAt = timestamp;
      pocketState.pocketName = pocket.nombre;
      this.costState = this.costState.map((state) =>
        state.pocketId === pocketId ? pocketState! : state
      );
    }

    this.synchronizePocketStorage();
  }

  private synchronizePocketStorage(): void {
    if (!this.budget) {
      return;
    }

    try {
      const raw = localStorage.getItem(this.pocketsStorageKey);
      if (!raw) {
        return;
      }

      const stored = JSON.parse(raw) as StoredPocketState | null;
      if (!stored) {
        return;
      }

      if (stored.budgetName !== this.budget.nombre || stored.budgetAmount !== this.budget.monto) {
        return;
      }

      const nextPockets = stored.pockets.map((pocket) => {
        const summary = this.pocketSummaries.find((item) => item.id === pocket.id);
        if (!summary) {
          return pocket;
        }
        return {
          ...pocket,
          gastos: summary.costAmount,
          saldoActual: summary.balance,
        } satisfies PocketDetails;
      });

      const payload: StoredPocketState = {
        budgetName: stored.budgetName,
        budgetAmount: stored.budgetAmount,
        pockets: nextPockets,
      };

      localStorage.setItem(this.pocketsStorageKey, JSON.stringify(payload));
      this.pockets = nextPockets;
    } catch (error) {
      console.warn('No se pudieron sincronizar los bolsillos con los gastos', error);
    }
  }

  private getContributionsTotalForPocket(pocketId: string): number {
    const state = this.contributionsState.find((entry) => entry.pocketId === pocketId);
    if (!state) {
      return 0;
    }
    return state.entries.reduce(
      (acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0),
      0
    );
  }

  private getContributorsCount(pocketId: string): number {
    const state = this.contributionsState.find((entry) => entry.pocketId === pocketId);
    if (!state) {
      return 0;
    }
    return state.entries.length;
  }

  private buildBudgetKey(): string | null {
    if (!this.budget) {
      return null;
    }
    return `${this.budget.nombre}|${this.budget.monto}`;
  }
}
