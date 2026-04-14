import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { Home } from './home';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EncuentroService } from '../../../services/encuentro.service';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

describe('Home Component', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpTestingController: HttpTestingController;
  let router: Router;
  let encuentroServiceSpy: jasmine.SpyObj<EncuentroService>;

  const getTestProviders = () => {
    encuentroServiceSpy = jasmine.createSpyObj('EncuentroService', ['salirDelEncuentro', 'deleteEncuentro']);
    return [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: EncuentroService, useValue: encuentroServiceSpy }
    ];
  };

  afterEach(() => {
    if (httpTestingController) {
      httpTestingController.verify();
    }
    jasmine.clock().uninstall();
    localStorage.clear(); // cleanup
  });

  describe('Initialization and Auth', () => {
    it('should handle invalid JSON in localStorage', async () => {
      spyOn(localStorage, 'getItem').and.returnValue('invalid_json');
      spyOn(console, 'error');

      await TestBed.configureTestingModule({
        imports: [Home, FormsModule],
        providers: getTestProviders()
      }).compileComponents();

      fixture = TestBed.createComponent(Home);
      component = fixture.componentInstance;
      
      expect(console.error).toHaveBeenCalled();
      expect(component.currentUserId).toBeNull();
    });

    it('should redirect if no user is found and not logged in', async () => {
      spyOn(localStorage, 'getItem').and.callFake((key: string) => {
        if (key === 'user') return null;
        if (key === 'isLogged') return 'false';
        return null;
      });

      await TestBed.configureTestingModule({
        imports: [Home, FormsModule],
        providers: getTestProviders()
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(Home);
      component = fixture.componentInstance;

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should assign currentUserId if user is found', async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 100 }));

      await TestBed.configureTestingModule({
        imports: [Home, FormsModule],
        providers: getTestProviders()
      }).compileComponents();

      fixture = TestBed.createComponent(Home);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);

      expect(component.currentUserId).toBe(100);
      
      // Should trigger loadEncuentros via constructor
      const req = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=100');
      req.flush([]);
    });
  });

  describe('Core Functionality & API', () => {
    const mockToday = new Date('2026-03-25T12:00:00Z');

    beforeEach(async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 99 }));
      jasmine.clock().install();
      jasmine.clock().mockDate(mockToday);

      // Mock Swal
      if (jasmine.isSpy(Swal.fire)) {
        (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
      } else {
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
      }

      await TestBed.configureTestingModule({
        imports: [Home, FormsModule],
        providers: getTestProviders()
      }).compileComponents();

      fixture = TestBed.createComponent(Home);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);

      // Flush initial load
      const initReq = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      initReq.flush([]);
    });

    it('should toggle create mode', () => {
      expect(component.showCreate).toBeFalse();
      component.toggleCreate();
      expect(component.showCreate).toBeTrue();
    });

    it('should warning for incomplete fields when creating', () => {
      component.newEncuentro.titulo = '';
      component.createEncuentro();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Campos incompletos' }));
    });

    it('should warning if date is in the past', () => {
      component.newEncuentro = { idCreador: 99, titulo: 'T', descripcion: 'D', lugar: 'L', fecha: '2026-03-20T10:00:00Z' }; // Past date
      component.createEncuentro();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Fecha inválida' }));
    });

    it('should create encuentro and reload list', () => {
      component.newEncuentro = { idCreador: 99, titulo: 'T', descripcion: 'D', lugar: 'L', fecha: '2026-04-01T10:00:00Z' };
      component.createEncuentro();

      const reqPost = httpTestingController.expectOne('http://localhost:3000/encuentro');
      expect(reqPost.request.method).toBe('POST');
      reqPost.flush({ message: 'Success' });

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Encuentro creado' }));
      expect(component.newEncuentro.titulo).toBe('');
      
      const reqGet = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      reqGet.flush([]);
    });

    it('should handle creation error', () => {
      component.newEncuentro = { idCreador: 99, titulo: 'T', descripcion: 'D', lugar: 'L', fecha: '2026-04-01T10:00:00Z' };
      component.createEncuentro();

      const req = httpTestingController.expectOne('http://localhost:3000/encuentro');
      req.flush({ message: 'Error Server' }, { status: 500, statusText: 'Internal Error' });

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error creando encuentro' }));
      expect(component.creating).toBeFalse();
    });

    it('should load encuentros and compute metrics correctly', () => {
      component.loadEncuentros();
      
      const req = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      req.flush([
        { id: 1, titulo: 'Today', fecha: '2026-03-25T14:00:00Z' },
        { id: 2, titulo: 'Past', fecha: '2026-03-20T10:00:00Z' },
        { id: 3, titulo: 'Future', fecha: '2026-04-05T10:00:00Z' },
        { id: 4, titulo: 'No date', fecha: null }
      ]);

      expect(component.encuentrosHoy).toBe(1);
      expect(component.encuentrosMes).toBe(2); // Today (March 25) + Past (March 20)
      expect(component.encuentrosPendientes).toBe(2); // Today's future hours + Future
      
      expect(component.daysWithEncuentros.has(25)).toBeTrue();
      expect(component.daysWithEncuentros.has(20)).toBeTrue();
    });
  });

  describe('Eliminar and Salir Logic', () => {
    beforeEach(async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 99 }));
      if (jasmine.isSpy(Swal.fire)) {
        (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
      } else {
        spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
      }

      await TestBed.configureTestingModule({
        imports: [Home, FormsModule],
        providers: getTestProviders()
      }).compileComponents();

      fixture = TestBed.createComponent(Home);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
      const initReq = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      initReq.flush([]);
    });

    it('should prevent deleting if not creator', () => {
      component.eliminarEncuentro({ idCreador: 1, titulo: 'X' });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'No tienes permiso' }));
    });

    it('should prevent leaving if is creator', () => {
      component.salirDeEncuentro({ idCreador: 99, titulo: 'X' });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'No puedes salir' }));
    });

    it('should leave encounter successfully', fakeAsync(() => {
      encuentroServiceSpy.salirDelEncuentro.and.returnValue(of({ success: true, message: 'Success' }));
      
      component.salirDeEncuentro({ id: 50, idCreador: 2, titulo: 'X' });
      flush();

      expect(encuentroServiceSpy.salirDelEncuentro).toHaveBeenCalledWith(50, 99);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Has salido del encuentro' }));
      
      const reqList = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      reqList.flush([]);
    }));

    it('should delete encounter successfully with double confirmation', fakeAsync(() => {
      encuentroServiceSpy.deleteEncuentro.and.returnValue(of({ success: true, message: 'Deleted' }));
      
      component.eliminarEncuentro({ id: 50, idCreador: 99, titulo: 'X' });
      flush();

      expect(encuentroServiceSpy.deleteEncuentro).toHaveBeenCalledWith(50, 99);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Encuentro eliminado' }));
      
      const reqList = httpTestingController.expectOne('http://localhost:3000/encuentro/resumen?creador=99');
      reqList.flush([]);
    }));

    it('should handle generic currentUserId missing in list calls', () => {
      component.currentUserId = null;
      spyOn(console, 'error');
      
      component.loadEncuentros();
      expect(console.error).toHaveBeenCalledWith('No currentUserId available for loading encuentros');
      
      component.salirDeEncuentro({ id: 1 });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'No se pudo identificar el usuario actual' }));
      
      component.eliminarEncuentro({ id: 1 });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'No se pudo identificar el usuario actual' }));
    });
  });
});
