import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Pockets } from './pockets';
import { BolsilloService } from '../../../services/bolsillo.service';

describe('Pockets Component', () => {
  let component: Pockets;
  let fixture: ComponentFixture<Pockets>;
  let httpTestingController: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let bolsilloServiceSpy: jasmine.SpyObj<BolsilloService>;
  
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => '10' // Mock encuentroId = 10
      }
    }
  };

  beforeEach(async () => {
    bolsilloServiceSpy = jasmine.createSpyObj('BolsilloService', ['eliminarBolsillo']);

    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 99 }));
    
    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    await TestBed.configureTestingModule({
      imports: [Pockets],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: BolsilloService, useValue: bolsilloServiceSpy }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
  });

  afterEach(() => {
    if (httpTestingController) {
      httpTestingController.verify();
    }
    localStorage.clear();
  });

  const createComponentAndFlushInit = () => {
    fixture = TestBed.createComponent(Pockets);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // calls ngOnInit

    // Flush loadPresupuesto parameters:
    const reqPresupuesto = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
    reqPresupuesto.flush({ id: 200 });
    
    // Flush loadPockets parameters:
    const reqPockets = httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10');
    reqPockets.flush([{ id: 1, nombre: 'Viaje', saldoActual: 1500, idPresupuesto: 200, idEncuentro: 10 }]);
  };

  describe('Initialization', () => {
    it('should handle localStorage warnings', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid json');
      spyOn(console, 'warn');
      
      createComponentAndFlushInit();

      expect(console.warn).toHaveBeenCalledWith('Error parseando user desde localStorage', jasmine.any(SyntaxError));
      expect(component.currentUserId).toBeNull();
    });

    it('should warn and not load if encuentroId is missing', () => {
      (mockActivatedRoute.snapshot.paramMap.get as any) = jasmine.createSpy().and.returnValue(null);
      
      fixture = TestBed.createComponent(Pockets);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      fixture.detectChanges();
      
      expect(component.encuentroId).toBeNull();
      expect(component.loading).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Sin encuentro' }));
      
      // Restore for other tests
      (mockActivatedRoute.snapshot.paramMap.get as any) = (key: string) => '10';
    });

    it('should load presupuesto and pockets correctly on init', () => {
      createComponentAndFlushInit();
      
      expect(component.presupuestoId).toBe(200);
      expect(component.pockets.length).toBe(1);
      expect(component.pockets[0].nombre).toBe('Viaje');
      expect(component.loading).toBeFalse();
    });

    it('should handle API error gracefully when loading presupuesto', () => {
      spyOn(console, 'error');
      
      fixture = TestBed.createComponent(Pockets);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      fixture.detectChanges(); 
      
      const reqPresupuesto = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      reqPresupuesto.flush('Not Found', { status: 404, statusText: 'Not Found' });
      
      const reqPockets = httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10');
      reqPockets.flush([]);

      expect(console.error).toHaveBeenCalled();
    });

    it('should handle API error gracefully when loading pockets', () => {
      spyOn(console, 'error');
      
      fixture = TestBed.createComponent(Pockets);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      fixture.detectChanges(); 
      
      const reqPresupuesto = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      reqPresupuesto.flush({ id: 200 });
      
      const reqPockets = httpTestingController.expectOne('http://localhost:3000/bolsillo?encuentro=10');
      reqPockets.flush('Server Error', { status: 500, statusText: 'Server Error' });

      expect(component.loading).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Creating Pockets', () => {
    beforeEach(() => {
      createComponentAndFlushInit();
    });

    it('should redirect if encuentroId goes missing during create', () => {
      component.encuentroId = null;
      component.onCreatePocket();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets', null]);
    });

    it('should not create if form is invalid', () => {
      component.pocketForm.setValue({ nombre: '' });
      component.onCreatePocket();
      expect(component.submitting).toBeFalse();
      expect(component.pocketForm.invalid).toBeTrue();
    });

    it('should create pocket successfully and update list', () => {
      component.pocketForm.setValue({ nombre: 'Comida' });
      component.onCreatePocket();
      
      expect(component.submitting).toBeTrue();
      
      const req = httpTestingController.expectOne('http://localhost:3000/bolsillo');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ idEncuentro: 10, idPresupuesto: 200, nombre: 'Comida', saldoActual: 0 });
      
      req.flush({ id: 2, nombre: 'Comida', saldoActual: 0, idPresupuesto: 200, idEncuentro: 10 });
      
      expect(component.submitting).toBeFalse();
      expect(component.pockets.length).toBe(2);
      expect(component.pockets[1].nombre).toBe('Comida');
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: '¡Bolsillo creado!' }));
      expect(component.pocketForm.value).toEqual({ nombre: null });
    });

    it('should handle API error when creating pocket', () => {
      spyOn(console, 'error');
      component.pocketForm.setValue({ nombre: 'Bebidas' });
      component.onCreatePocket();
      
      const req = httpTestingController.expectOne('http://localhost:3000/bolsillo');
      req.flush({ message: 'Error de servidor' }, { status: 500, statusText: 'Internal Error' });
      
      expect(component.submitting).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Error de servidor' }));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Routing', () => {
    beforeEach(() => {
      createComponentAndFlushInit();
    });

    it('should navigate to budgets', () => {
      component.goToBudgets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets', '10']);
    });

    it('should navigate to contributions', () => {
      component.goToContributions();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/contributions', '10']);
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

  describe('Deleting Pockets', () => {
    beforeEach(() => {
      createComponentAndFlushInit();
    });

    it('should prevent deletion if currentUserId is missing', () => {
      component.currentUserId = null;
      component.eliminarBolsillo(component.pockets[0]);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'No se pudo identificar el usuario o bolsillo actual' }));
    });

    it('should track items correctly', () => {
      const trackId = component.trackPocketById(0, component.pockets[0]);
      expect(trackId).toBe('1');
    });

    it('should delete pocket and update local state', fakeAsync(() => {
      bolsilloServiceSpy.eliminarBolsillo.and.returnValue(of({ success: true, message: 'Bolsillo Eliminado' }));
      
      component.eliminarBolsillo(component.pockets[0]);
      flush();

      expect(bolsilloServiceSpy.eliminarBolsillo).toHaveBeenCalledWith(1, 99);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Bolsillo eliminado' }));
      expect(component.pockets.length).toBe(0);
    }));

    it('should handle deletion error', fakeAsync(() => {
      spyOn(console, 'error');
      bolsilloServiceSpy.eliminarBolsillo.and.returnValue(throwError(() => ({ error: { message: 'Tiene aportes' } })));
      
      component.eliminarBolsillo(component.pockets[0]);
      flush();

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Tiene aportes' }));
      expect(console.error).toHaveBeenCalled();
      expect(component.pockets.length).toBe(1); // Item not deleted
    }));
  });
});
