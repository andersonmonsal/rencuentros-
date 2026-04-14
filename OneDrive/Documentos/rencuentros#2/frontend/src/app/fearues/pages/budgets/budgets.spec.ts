import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Budgets } from './budgets';
import { PresupuestoService } from '../../../services/presupuesto.service';

describe('Budgets Component', () => {
  let component: Budgets;
  let fixture: ComponentFixture<Budgets>;
  let httpTestingController: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let presupuestoServiceSpy: jasmine.SpyObj<PresupuestoService>;
  
  const mockActivatedRoute = {
    snapshot: {
      paramMap: {
        get: (key: string) => '10' // Mock encuentroId = 10
      }
    }
  };

  beforeEach(async () => {
    presupuestoServiceSpy = jasmine.createSpyObj('PresupuestoService', ['eliminarItem']);

    spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 99 }));
    
    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    await TestBed.configureTestingModule({
      imports: [Budgets],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: PresupuestoService, useValue: presupuestoServiceSpy }
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

  const createComponent = () => {
    fixture = TestBed.createComponent(Budgets);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // calls ngOnInit
  };

  describe('Initialization', () => {
    it('should handle localStorage warnings', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid json');
      spyOn(console, 'warn');
      createComponent();

      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      req.flush({ id: 100 });

      expect(console.warn).toHaveBeenCalledWith('Error parseando user desde localStorage', jasmine.any(SyntaxError));
      expect(component.currentUserId).toBeNull();
    });

    it('should warn and not load if encuentroId is missing', () => {
      (mockActivatedRoute.snapshot.paramMap.get as any) = jasmine.createSpy().and.returnValue(null);
      createComponent();
      
      expect(component.encuentroId).toBeNull();
      expect(component.loading).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Sin encuentro' }));
      
      // Restore for other tests
      (mockActivatedRoute.snapshot.paramMap.get as any) = (key: string) => '10';
    });

    it('should load presupuesto correctly on init', () => {
      createComponent();
      
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 100, presupuestoTotal: 50, idEncuentro: 10, items: [] });
      
      expect(component.budget?.id).toBe(100);
      expect(component.budget?.presupuestoTotal).toBe(50);
      expect(component.loading).toBeFalse();
    });

    it('should handle API error gracefully when loading', () => {
      spyOn(console, 'error');
      createComponent();
      
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      
      expect(component.loading).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Adding Items', () => {
    beforeEach(() => {
      createComponent();
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      req.flush({ id: 100, presupuestoTotal: 0, idEncuentro: 10, items: [] });
    });

    it('should not add if form is invalid', () => {
      component.itemForm.setValue({ nombreItem: '', montoItem: '0' });
      component.onAddItem();
      expect(component.addingItem).toBeFalse();
      expect(component.itemForm.invalid).toBeTrue();
    });

    it('should add item successfully and update total', () => {
      component.itemForm.setValue({ nombreItem: 'Cervezas', montoItem: '500' });
      component.onAddItem();
      
      expect(component.addingItem).toBeTrue();
      
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto/item');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ idPresupuesto: 100, idEncuentro: 10, nombreItem: 'Cervezas', montoItem: 500 });
      
      req.flush({ id: 1, nombreItem: 'Cervezas', montoItem: 500 });
      
      expect(component.addingItem).toBeFalse();
      expect(component.budget?.items?.length).toBe(1);
      expect(component.budget?.presupuestoTotal).toBe(500);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Item agregado' }));
      expect(component.itemForm.value).toEqual({ nombreItem: null, montoItem: null });
    });

    it('should handle API error when adding item', () => {
      spyOn(console, 'error');
      component.itemForm.setValue({ nombreItem: 'Cervezas', montoItem: '500' });
      component.onAddItem();
      
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto/item');
      req.flush({ message: 'Error Server' }, { status: 500, statusText: 'Internal Error' });
      
      expect(component.addingItem).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Error Server' }));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Routing', () => {
    beforeEach(() => {
      createComponent();
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      req.flush({ id: 100 });
    });

    it('should navigate to pockets', () => {
      component.goToPockets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/pockets', '10']);
    });

    it('should navigate to encuentro', () => {
      component.goToEncuentro();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chat-detail', '10']);
    });
  });

  describe('Deleting Items', () => {
    beforeEach(() => {
      createComponent();
      const req = httpTestingController.expectOne('http://localhost:3000/presupuesto?encuentro=10');
      req.flush({ 
        id: 100, 
        presupuestoTotal: 500, 
        idEncuentro: 10, 
        items: [{ id: 1, nombreItem: 'Test', montoItem: 500 }] 
      });
    });

    it('should prevent deletion if currentUserId is missing', () => {
      component.currentUserId = null;
      component.eliminarItem({ id: 1, nombreItem: 'Test', montoItem: 50 });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'No se pudo identificar el usuario actual' }));
    });

    it('should delete item and update local state', fakeAsync(() => {
      presupuestoServiceSpy.eliminarItem.and.returnValue(of({ success: true, message: 'Item Eliminado' }));
      
      component.eliminarItem(component.budget!.items![0]);
      flush();

      expect(presupuestoServiceSpy.eliminarItem).toHaveBeenCalledWith(1, 99);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Item eliminado' }));
      expect(component.budget?.items?.length).toBe(0);
      expect(component.budget?.presupuestoTotal).toBe(0);
    }));

    it('should handle deletion error', fakeAsync(() => {
      spyOn(console, 'error');
      // Mocking an error response
      presupuestoServiceSpy.eliminarItem.and.returnValue(throwError(() => ({ error: { message: 'Cannot delete' } })));
      
      component.eliminarItem(component.budget!.items![0]);
      flush();

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Cannot delete' }));
      expect(console.error).toHaveBeenCalled();
      expect(component.budget?.items?.length).toBe(1); // Item not deleted
    }));
  });
});
