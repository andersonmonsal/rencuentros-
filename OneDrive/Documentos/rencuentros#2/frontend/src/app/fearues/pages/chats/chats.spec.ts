import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Chats } from './chats';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('Chats Component', () => {
  let component: Chats;
  let fixture: ComponentFixture<Chats>;
  let httpTestingController: HttpTestingController;

  const getEncountersOptions = () => ({
    imports: [Chats],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([])
    ]
  });

  afterEach(() => {
    if (httpTestingController) {
      httpTestingController.verify();
    }
    jasmine.clock().uninstall();
  });

  describe('Component Initialization', () => {
    it('should handle invalid JSON in localStorage gracefully', async () => {
      spyOn(localStorage, 'getItem').and.returnValue('invalid json');
      spyOn(console, 'warn');
      
      await TestBed.configureTestingModule(getEncountersOptions()).compileComponents();
      fixture = TestBed.createComponent(Chats);
      component = fixture.componentInstance;
      
      expect(console.warn).toHaveBeenCalledWith('Error parseando user desde localStorage', jasmine.any(SyntaxError));
      expect(component.currentUserId).toBeNull();
    });

    it('should handle localStorage without user id gracefully', async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ name: 'User' }));
      
      await TestBed.configureTestingModule(getEncountersOptions()).compileComponents();
      fixture = TestBed.createComponent(Chats);
      component = fixture.componentInstance;
      
      expect(component.currentUserId).toBeNull();
    });

    it('should assign currentUserId if localStorage is valid', async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 100, name: 'User' }));
      
      await TestBed.configureTestingModule(getEncountersOptions()).compileComponents();
      fixture = TestBed.createComponent(Chats);
      component = fixture.componentInstance;
      
      expect(component.currentUserId).toBe(100);
    });
  });

  describe('loadChats() Logic', () => {
    const mockToday = new Date('2026-03-25T12:00:00Z');

    beforeEach(async () => {
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify({ id: 99 }));
      jasmine.clock().install();
      jasmine.clock().mockDate(mockToday);

      await TestBed.configureTestingModule(getEncountersOptions()).compileComponents();
      fixture = TestBed.createComponent(Chats);
      component = fixture.componentInstance;
      httpTestingController = TestBed.inject(HttpTestingController);
    });

    it('should return early if no currentUserId', () => {
      component.currentUserId = null;
      spyOn(console, 'warn');
      
      component.loadChats();
      
      expect(console.warn).toHaveBeenCalledWith('No hay usuario logueado');
    });

    it('should load and formats chats correctly from backend', () => {
      component.loadChats();

      const req = httpTestingController.expectOne('http://localhost:3000/encuentro?creador=99');
      expect(req.request.method).toEqual('GET');

      req.flush([
        { id: 1, titulo: '', lugar: 'Casa' }, // Should be filtered out
        { 
          id: 2, 
          titulo: 'Fiesta Sorpresa', 
          lugar: 'Parque', 
          fecha: '2026-03-25T14:30:00Z' // Today
        },
        { 
          id: 3, 
          titulo: 'Reunion Trabajo', 
          lugar: 'Oficina', 
          fecha: '2026-03-24T10:00:00Z' // Yesterday
        },
        { 
          id: 4, 
          titulo: 'Viaje a la Playa', 
          lugar: 'Cancun', 
          fecha: '2026-03-15T08:00:00Z' // Older date
        },
        { 
          id: 5, 
          titulo: 'Evento Sin Tiempo', 
          lugar: 'Secret',
          fecha: 'not-a-valid-date' // Invalid date
        },
        { 
          id: 6, 
          titulo: 'Cena Amigos', 
          lugar: '',
          fecha: null // No date
        }
      ]);

      expect(component.chats.length).toBe(5); // Item 1 filtered out

      // Item 2: Fiesta Sorpresa (Today)
      expect(component.chats[0].initials).toBe('FS');
      expect(component.chats[0].timeLabel).toContain(':'); // locale time string
      expect(component.chats[0].lastMessage).toBe('Chat del encuentro en Parque');

      // Item 3: Reunion Trabajo (Yesterday)
      expect(component.chats[1].initials).toBe('RT');
      expect(component.chats[1].timeLabel).toBe('Ayer');

      // Item 4: Viaje a la Playa (Older)
      expect(component.chats[2].initials).toBe('VA');
      expect(component.chats[2].timeLabel).not.toBe('Ayer');

      // Item 5: Invalid date
      expect(component.chats[3].timeLabel).toBe('Fecha inválida');

      // Item 6: No date
      expect(component.chats[4].initials).toBe('CA');
      expect(component.chats[4].lastMessage).toBe('Chat del encuentro');
      expect(component.chats[4].timeLabel).toBe('Sin fecha');
    });

    it('should handle HTTP error when loading chats', () => {
      spyOn(console, 'error');
      
      component.loadChats();
      const req = httpTestingController.expectOne('http://localhost:3000/encuentro?creador=99');
      req.flush('Error de servidor', { status: 500, statusText: 'Internal Server Error' });

      expect(console.error).toHaveBeenCalledWith('Error cargando encuentros', jasmine.any(Object));
      expect(component.chats).toEqual([]);
    });
  });
});
