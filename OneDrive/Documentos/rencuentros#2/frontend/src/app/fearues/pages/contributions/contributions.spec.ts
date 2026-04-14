import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import Swal from 'sweetalert2';
import Contributions from './contributions';

describe('Contributions Component', () => {
  let component: Contributions;
  let fixture: ComponentFixture<Contributions>;
  let httpTestingController: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => '10' // Mock encuentroId = 10
      }
    }
  };

  beforeEach(async () => {
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'user') return JSON.stringify({ id: 99, nombre: 'Test', email: 'test@test.com' });
      return null;
    });
    
    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    await TestBed.configureTestingModule({
      imports: [Contributions],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
  });

  afterEach(() => {
    if (httpTestingController) {
      httpTestingController.verify();
    }
  });

  const createComponentAndFlushAll = () => {
    fixture = TestBed.createComponent(Contributions);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit

    // 1. loadParticipantes
    const reqParticipantes = httpTestingController.expectOne('http://localhost:3000/participantes-encuentro?encuentro=10');
    reqParticipantes.flush([{ id: 99 }, { id: 100 }]);

    // 2. loadBudget
    const reqBudget = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
    reqBudget.flush({ id: 200, presupuestoTotal: 1000 });

    // 3. loadPockets
    const reqPockets = httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10');
    reqPockets.flush([
      { id: 1, nombre: 'Viaje', saldoActual: 0 },
      { id: 2, nombre: 'Comida', saldoActual: 0 }
    ]);

    // 4. loadAportes
    const reqAportes = httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10');
    reqAportes.flush([
      { id: 50, idBolsillo: 1, idUsuario: 99, monto: 500 }, // Mi aporte al bolsillo 1
      { id: 51, idBolsillo: 1, idUsuario: 100, monto: 500 } // Otro aporte al bolsillo 1
    ]);
  };

  describe('Initialization and Getters', () => {
    it('should warn and not load if encuentroId is missing', () => {
      (mockActivatedRoute.snapshot.paramMap.get as any) = jasmine.createSpy().and.returnValue(null);
      
      fixture = TestBed.createComponent(Contributions);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      
      expect(component.encuentroId).toBeNull();
      expect(component.loading).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Sin encuentro' }));
      
      // Restore for other tests
      (mockActivatedRoute.snapshot.paramMap.get as any) = (key: string) => '10';
    });

    it('should handle missing user in localStorage', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      spyOn(console, 'warn');
      createComponentAndFlushAll();
      expect(console.warn).toHaveBeenCalledWith('No se encontró user en localStorage');
      expect(component.currentUser).toBeNull();
    });

    it('should parse user successfully', () => {
      createComponentAndFlushAll();
      expect(component.currentUser?.id).toBe(99);
      expect(component.isLoggedIn).toBeTrue();
    });

    it('should calculate getters properly', () => {
      createComponentAndFlushAll();
      
      // budget = 1000, 2 participantes => aportePorPersona = 500
      expect(component.participantes.aportePorPersona).toBe(500);
      expect(component.hasBudget).toBeTrue();
      expect(component.hasPockets).toBeTrue();
      
      const summaries = component.getPocketSummaries();
      expect(summaries.length).toBe(2);
      expect(summaries[0].totalContributions).toBe(1000);
      expect(summaries[0].myContribution).toBe(500);
      expect(summaries[0].otherEntries.length).toBe(1);
      
      expect(component.totalCollected).toBe(1000);
      expect(component.myTotalContribution).toBe(500);
    });

    it('should return 0 for myTotalContribution if no user', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      createComponentAndFlushAll();
      expect(component.myTotalContribution).toBe(0);
    });

    it('should track items correctly', () => {
      createComponentAndFlushAll();
      expect(component.trackPocketById(0, { id: 1 } as any)).toBe(1);
    });
  });

  describe('Error Handling on Initialization', () => {
    beforeEach(() => {
      spyOn(console, 'error');
      fixture = TestBed.createComponent(Contributions);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
    });

    it('should handle API errors across parallel requests (participantes)', () => {
      const r1 = httpTestingController.expectOne('http://localhost:3000/participantes-encuentro?encuentro=10');
      r1.flush('Error', { status: 500, statusText: 'Error' });
      expect(console.error).toHaveBeenCalledWith('Error cargando participantes', jasmine.any(Object));

      httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10').flush({});
      httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10').flush([]);
      httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10').flush([]);
    });

    it('should handle API errors across parallel requests (budget)', () => {
      httpTestingController.expectOne('http://localhost:3000/participantes-encuentro?encuentro=10').flush([]);
      
      const r2 = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      r2.flush('Error', { status: 500, statusText: 'Error' });
      expect(console.error).toHaveBeenCalledWith('Error cargando presupuesto', jasmine.any(Object));

      httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10').flush([]);
      httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10').flush([]);
    });

    it('should handle API errors across parallel requests (pockets)', () => {
      httpTestingController.expectOne('http://localhost:3000/participantes-encuentro?encuentro=10').flush([]);
      httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10').flush({});
      
      const r3 = httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10');
      r3.flush('Error', { status: 500, statusText: 'Error' });
      expect(console.error).toHaveBeenCalledWith('Error cargando bolsillos', jasmine.any(Object));

      httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10').flush([]);
    });

    it('should handle API errors across parallel requests (aportes)', () => {
      httpTestingController.expectOne('http://localhost:3000/participantes-encuentro?encuentro=10').flush([]);
      httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10').flush({});
      httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10').flush([]);
      
      const r4 = httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10');
      r4.flush('Error', { status: 500, statusText: 'Error' });
      expect(console.error).toHaveBeenCalledWith('Error cargando aportes', jasmine.any(Object));
      expect(component.loading).toBeFalse();
    });
  });

  describe('Confirming Contribution', () => {
    it('should error if encuentroId is missing', fakeAsync(() => {
      createComponentAndFlushAll();
      component.encuentroId = null;
      component.confirmContribution(1);
      flush();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'No se ha especificado un encuentro' }));
    }));

    it('should warn if user is not logged in', fakeAsync(() => {
      (localStorage.getItem as jasmine.Spy).and.returnValue(null);
      createComponentAndFlushAll();
      component.confirmContribution(1);
      flush();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Necesitas iniciar sesión' }));
    }));

    it('should warn if form is invalid or missing', fakeAsync(() => {
      createComponentAndFlushAll();
      const form = component.getPocketForm(1);
      form?.setValue({ amount: 0 }); // Invalid: less than 0.01

      component.confirmContribution(1);
      flush();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Validación' }));
    }));

    it('should error if pocket does not exist', fakeAsync(() => {
      createComponentAndFlushAll();
      // Form for a non-existent pocket
      component.pocketForms.set(999, component['fb'].group({ amount: [100] }));
      
      component.confirmContribution(999);
      flush();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'No se encontró el bolsillo seleccionado' }));
    }));

    it('should cancel contribution if Swal is dismissed', fakeAsync(() => {
      createComponentAndFlushAll();
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: false } as any));
      
      const form = component.getPocketForm(2); // Form exists (amount initially null since no myAporte)
      form?.setValue({ amount: 100 });
      
      component.confirmContribution(2);
      flush();
      
      // Expected no HTTP requests 
      httpTestingController.verify();
    }));

    it('should patch existing contribution if myAporte exists', fakeAsync(() => {
      createComponentAndFlushAll();
      
      // Pocket 1 already has an aporte (id: 50) for currentUser (id: 99). Amount was 500.
      const form = component.getPocketForm(1);
      form?.setValue({ amount: 600 });
      
      component.confirmContribution(1);
      flush();
      
      const reqPatch = httpTestingController.expectOne('http://localhost:3000/aporte/50');
      expect(reqPatch.request.method).toBe('PATCH');
      expect(reqPatch.request.body).toEqual({ monto: 600 });
      reqPatch.flush({});
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: '¡Aporte actualizado!' }));
      
      // It subsequently calls loadAportes()
      httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10').flush([]);
    }));

    it('should post new contribution if myAporte does not exist', fakeAsync(() => {
      createComponentAndFlushAll();
      
      // Pocket 2 has no aportes from currentUser
      const form = component.getPocketForm(2);
      form?.setValue({ amount: 1000 });
      
      component.confirmContribution(2);
      flush();
      
      const reqPost = httpTestingController.expectOne('http://localhost:3000/aporte');
      expect(reqPost.request.method).toBe('POST');
      expect(reqPost.request.body).toEqual({ idBolsillo: 2, idEncuentro: 10, idUsuario: 99, monto: 1000 });
      reqPost.flush({ id: 900 });
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: '¡Aporte registrado!' }));
      
      // It subsqeuently calls loadAportes and loadPockets
      httpTestingController.expectOne('http://localhost:3000/aporte?encuentro=10').flush([]);
      httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10').flush([]);
    }));

    it('should handle patch error', fakeAsync(() => {
      spyOn(console, 'error');
      createComponentAndFlushAll();
      
      const form = component.getPocketForm(1);
      form?.setValue({ amount: 600 });
      
      component.confirmContribution(1);
      flush();
      
      const reqPatch = httpTestingController.expectOne('http://localhost:3000/aporte/50');
      reqPatch.flush('Error', { status: 500, statusText: 'Error' });
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'No se pudo actualizar el aporte' }));
      expect(console.error).toHaveBeenCalled();
      expect(component.submittingPocketId).toBeNull();
    }));

    it('should handle post error', fakeAsync(() => {
      spyOn(console, 'error');
      createComponentAndFlushAll();
      
      const form = component.getPocketForm(2);
      form?.setValue({ amount: 1000 });
      
      component.confirmContribution(2);
      flush();
      
      const reqPost = httpTestingController.expectOne('http://localhost:3000/aporte');
      reqPost.flush({ message: 'Server blow up' }, { status: 500, statusText: 'Error' });
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Server blow up' }));
      expect(console.error).toHaveBeenCalled();
      expect(component.submittingPocketId).toBeNull();
    }));
  });

  describe('Routing', () => {
    beforeEach(() => {
      createComponentAndFlushAll();
    });

    it('should navigate to budgets', () => {
      component.goToBudgets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets', '10']);
    });

    it('should navigate to pockets', () => {
      component.goToPockets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/pockets', '10']);
    });

    it('should navigate to costs', () => {
      component.goToCosts();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/costs', '10']);
    });

    it('should navigate to encuentro details', () => {
      component.goToEncuentro();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chat-detail', '10']);
    });
  });
});
