import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import Swal from 'sweetalert2';
import { Costs } from './costs';

describe('Costs Component', () => {
  let component: Costs;
  let fixture: ComponentFixture<Costs>;
  let routerSpy: jasmine.SpyObj<Router>;
  let mockLocalStorage: { [key: string]: string } = {};

  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => '10' // Mock encuentroId = 10
      }
    }
  };

  beforeEach(async () => {
    registerLocaleData(localeEs, 'es-CO');
    registerLocaleData(localeEs, 'es');

    // Setup LocalStorage Mock
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });

    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    await TestBed.configureTestingModule({
      imports: [Costs],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: LOCALE_ID, useValue: 'es-CO' }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
  });

  const setupLocalStorageData = () => {
    mockLocalStorage['user'] = JSON.stringify({ id: 99, nombre: 'TestUser', email: 'test@test.com' });
    mockLocalStorage['encuentros:selected-budget'] = JSON.stringify({ nombre: 'Presupuesto Viaje', monto: 5000 });
    mockLocalStorage['encuentros:pockets'] = JSON.stringify({
      budgetName: 'Presupuesto Viaje',
      budgetAmount: 5000,
      pockets: [
        { id: '1', nombre: 'Bolsillo A', saldoActual: 0, gastos: 0 },
        { id: '2', nombre: 'Bolsillo B', saldoActual: 0, gastos: 0 }
      ]
    });
    // Build budget key: nombre|monto
    const budgetKey = 'Presupuesto Viaje|5000';
    mockLocalStorage['encuentros:contributions'] = JSON.stringify({
      [budgetKey]: [
        { pocketId: '1', pocketName: 'Bolsillo A', entries: [{ amount: 1000 }, { amount: 500 }] }, // 1500 total
        { pocketId: '2', pocketName: 'Bolsillo B', entries: [{ amount: 2000 }] } // 2000 total
      ]
    });
    mockLocalStorage['encuentros:costs'] = JSON.stringify({
      [budgetKey]: [
        { pocketId: '1', pocketName: 'Bolsillo A', itemName: 'Hotel', amount: 800, recordedById: 99, recordedByName: 'TestUser', updatedAt: new Date().toISOString() }
      ]
    });
  };

  const createComponent = () => {
    fixture = TestBed.createComponent(Costs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  describe('Initialization and Loading', () => {
    it('should initialize with empty data if localStorage is empty', () => {
      createComponent();
      expect(component.encuentroId).toBe('10');
      expect(component.budget).toBeNull();
      expect(component.currentUser).toBeNull();
      expect(component.pockets.length).toBe(0);
      expect(component.hasBudget).toBeFalse();
      expect(component.hasPockets).toBeFalse();
      expect(component.isLoggedIn).toBeFalse();
      expect(component.pocketSummaries.length).toBe(0);
    });

    it('should handle malformed JSON in localStorage gracefully', () => {
      mockLocalStorage['user'] = 'invalid json';
      mockLocalStorage['encuentros:selected-budget'] = 'invalid json';
      mockLocalStorage['encuentros:pockets'] = 'invalid json';
      mockLocalStorage['encuentros:contributions'] = 'invalid json';
      mockLocalStorage['encuentros:costs'] = 'invalid json';
      
      spyOn(console, 'warn');
      createComponent();
      
      expect(console.warn).toHaveBeenCalled(); // Since we catch malformed JSON and log warn
      expect(component.budget).toBeNull();
    });

    it('should load data successfully from localStorage', () => {
      setupLocalStorageData();
      createComponent();

      expect(component.hasBudget).toBeTrue();
      expect(component.isLoggedIn).toBeTrue();
      expect(component.pockets.length).toBe(2);
      expect(component.budget?.nombre).toBe('Presupuesto Viaje');
      expect(component.currentUser?.id).toBe(99);
      
      // Verification of summaries parsing
      expect(component.pocketSummaries.length).toBe(2);
      
      // Pocket 1: 1500 contributions, 800 cost => balance 700
      const summary1 = component.pocketSummaries.find(s => s.id === '1');
      expect(summary1?.totalContributions).toBe(1500);
      expect(summary1?.costAmount).toBe(800);
      expect(summary1?.balance).toBe(700);

      // Pocket 2: 2000 contributions, 0 cost => balance 2000
      const summary2 = component.pocketSummaries.find(s => s.id === '2');
      expect(summary2?.totalContributions).toBe(2000);
      expect(summary2?.costAmount).toBe(0);
      expect(summary2?.balance).toBe(2000);

      // Global Getters
      expect(component.totalCollected).toBe(3500); // 1500 + 2000
      expect(component.totalSpent).toBe(800);
      expect(component.remainingBalance).toBe(2700);
    });

    it('should ignore data that does not belong to the current budget', () => {
      mockLocalStorage['encuentros:selected-budget'] = JSON.stringify({ nombre: 'Budget A', monto: 100 });
      mockLocalStorage['encuentros:pockets'] = JSON.stringify({
        budgetName: 'Budget B', // mismatch!
        budgetAmount: 200,
        pockets: [{ id: '1', nombre: 'B', saldoActual: 0, gastos: 0 }]
      });
      createComponent();
      expect(component.pockets.length).toBe(0);
    });
    
    it('should track pocket by ID', () => {
      setupLocalStorageData();
      createComponent();
      expect(component.trackPocketById(0, component.pocketSummaries[0])).toBe('1');
    });
  });

  describe('Costs Confirmation (confirmCost)', () => {
    beforeEach(() => {
      setupLocalStorageData();
      createComponent();
    });

    it('should navigate to budgets if no budget exists', async () => {
      component.budget = null;
      await component.confirmCost('1');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets']);
    });

    it('should fire warning if user is not logged in', async () => {
      component.currentUser = null;
      await component.confirmCost('1');
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Necesitas iniciar sesión' }));
    });

    it('should abort if form is invalid (empty name/amount)', async () => {
      const form = component.getPocketForm('1');
      form.setValue({ nombre: '', amount: null });
      await component.confirmCost('1');
      expect(form.invalid).toBeTrue();
      expect(Swal.fire).not.toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Confirmar gasto' }));
    });
    
    it('should abort if amount <= 0', async () => {
      const form = component.getPocketForm('1');
      form.setValue({ nombre: 'Gasto', amount: 0 });
      await component.confirmCost('1');
      expect(form.get('amount')?.errors?.['min']).toBeTruthy();
    });

    it('should show error if pocket is not found', async () => {
      const form = component.getPocketForm('999'); // Invalid Pocket ID
      form.setValue({ nombre: 'Gasto Secreto', amount: 50 });
      await component.confirmCost('999');
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Bolsillo no encontrado' }));
    });

    it('should not update state if SweetAlert is cancelled', fakeAsync(() => {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: false } as any));
      const form = component.getPocketForm('2'); // Clean pocket
      form.setValue({ nombre: 'Transporte', amount: 120 });
      
      component.confirmCost('2');
      flush();

      // State remains unchanged
      const summary2 = component.pocketSummaries.find(s => s.id === '2');
      expect(summary2?.costAmount).toBe(0); // Before update
    }));

    it('should correctly save NEW cost on confirm', fakeAsync(() => {
      const form = component.getPocketForm('2'); // Clean pocket
      form.setValue({ nombre: 'Comida', amount: 1500 });
      
      component.confirmCost('2');
      flush();

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Gasto registrado' }));
      
      // Verification of recalculation:
      const summary2 = component.pocketSummaries.find(s => s.id === '2');
      expect(summary2?.costAmount).toBe(1500);
      expect(summary2?.balance).toBe(500); // 2000 collected - 1500 cost
      
      // Verify persistence to mock localStorage:
      const storedCostsStr = mockLocalStorage['encuentros:costs'];
      const storedCosts = JSON.parse(storedCostsStr);
      const budgetKey = 'Presupuesto Viaje|5000';
      const costsForBudget = storedCosts[budgetKey];
      // Should now have 2 costs!
      expect(costsForBudget.length).toBe(2);
      
      const newCost = costsForBudget.find((c: any) => c.pocketId === '2');
      expect(newCost.itemName).toBe('Comida');
      expect(newCost.amount).toBe(1500);
      expect(newCost.recordedById).toBe(99);
    }));

    it('should correctly UPDATE existing cost on confirm', fakeAsync(() => {
      // Pocket 1 already has 800 for 'Hotel'
      const form = component.getPocketForm('1');
      form.setValue({ nombre: 'Hotel Caro', amount: 1200 }); // Changed from 800 to 1200
      
      component.confirmCost('1');
      flush();

      // Verification of recalculation:
      const summary1 = component.pocketSummaries.find(s => s.id === '1');
      expect(summary1?.costAmount).toBe(1200);
      expect(summary1?.balance).toBe(300); // 1500 collected - 1200 cost
      
      // Verify persistence to mock localStorage:
      const storedCostsStr = mockLocalStorage['encuentros:costs'];
      const storedCosts = JSON.parse(storedCostsStr);
      const budgetKey = 'Presupuesto Viaje|5000';
      const costsForBudget = storedCosts[budgetKey];
      
      const updatedCost = costsForBudget.find((c: any) => c.pocketId === '1');
      expect(updatedCost.itemName).toBe('Hotel Caro');
      expect(updatedCost.amount).toBe(1200);
    }));

    it('should handle parseAmount for string inputs safely', fakeAsync(() => {
      const form = component.getPocketForm('2');
      // Pass string amount simulating inputs:
      form.setValue({ nombre: 'Tax', amount: '120.50' }); 
      
      component.confirmCost('2');
      flush();

      const summary2 = component.pocketSummaries.find(s => s.id === '2');
      expect(summary2?.costAmount).toBe(120.50);
    }));
  });

  describe('Routing Navigation', () => {
    beforeEach(() => {
      createComponent();
    });

    it('should navigate to budgets', () => {
      component.goToBudgets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets', '10']);
    });

    it('should navigate to pockets', () => {
      component.goToPockets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/pockets', '10']);
    });

    it('should navigate to contributions', () => {
      component.goToContributions();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/contributions', '10']);
    });

    it('should navigate to encuentro details', () => {
      component.goToEncuentro();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chat-detail', '10']);
    });
  });
});
