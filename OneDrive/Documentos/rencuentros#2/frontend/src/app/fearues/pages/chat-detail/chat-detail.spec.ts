import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChatDetail } from './chat-detail';
import { EncuentroService } from '../../../services/encuentro.service';
import Swal from 'sweetalert2';

describe('ChatDetail Component', () => {
  let component: ChatDetail;
  let fixture: ComponentFixture<ChatDetail>;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let encuentroServiceSpy: jasmine.SpyObj<EncuentroService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let routeStub: any;

  beforeEach(async () => {
    const hSpy = jasmine.createSpyObj('HttpClient', ['get', 'post', 'patch', 'delete']);
    const eSpy = jasmine.createSpyObj('EncuentroService', ['updateEncuentro', 'salirDelEncuentro', 'deleteEncuentro']);
    const rSpy = jasmine.createSpyObj('Router', ['navigate']);
    routeStub = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ChatDetail],
      providers: [
        { provide: HttpClient, useValue: hSpy },
        { provide: EncuentroService, useValue: eSpy },
        { provide: Router, useValue: rSpy },
        { provide: ActivatedRoute, useValue: routeStub }
      ]
    }).compileComponents();

    httpSpy = TestBed.inject(HttpClient) as jasmine.SpyObj<HttpClient>;
    encuentroServiceSpy = TestBed.inject(EncuentroService) as jasmine.SpyObj<EncuentroService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = (key: string) => {
      if (key === 'user') return JSON.stringify({ id: 100, name: 'Test User' });
      return null;
    };
    if (jasmine.isSpy(localStorage.getItem)) {
      (localStorage.getItem as jasmine.Spy).and.callFake(localStorageMock);
    } else {
      spyOn(localStorage, 'getItem').and.callFake(localStorageMock);
    }
    // Mock Swal.fire to return a RESOLVED value as a Promise
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    // Silence console
    spyOn(console, 'error');
    spyOn(console, 'warn');

    // Set default return values for httpSpy to prevent 'subscribe' on undefined
    httpSpy.get.and.returnValue(of({}));
    httpSpy.post.and.returnValue(of({}));
    httpSpy.patch.and.returnValue(of({}));
    httpSpy.delete.and.returnValue(of({}));

    fixture = TestBed.createComponent(ChatDetail);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization (ngOnInit)', () => {
    it('should navigate to /chats if id is missing in route', () => {
      routeStub.snapshot.paramMap.get.and.returnValue(null);
      component.ngOnInit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chats']);
    });

    it('should load encounter and participants if id is present', () => {
      const mockEncuentro = { id: 1, titulo: 'Test', idCreador: 100 };
      httpSpy.get.and.returnValue(of(mockEncuentro));

      component.ngOnInit();

      expect(httpSpy.get).toHaveBeenCalledWith(jasmine.stringMatching(/\/encuentro\/1/));
      expect(httpSpy.get).toHaveBeenCalledWith(jasmine.stringMatching(/\/participantes-encuentro\?encuentro=1/));
    });

    it('should navigate to /chats if encounter load fails', () => {
      httpSpy.get.and.callFake((url: string): any => {
        if (url.includes('/encuentro/1')) return throwError(() => new Error('Not found'));
        return of([]);
      });

      component.ngOnInit();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chats']);
    });

    it('should handle participants loading errors gracefully', () => {
      httpSpy.get.and.callFake((url: string): any => {
        if (url.includes('participantes-encuentro')) return throwError(() => new Error('Error'));
        return of({});
      });
      component.encuentroId = '1';
      component.loadParticipantes();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('User Actions and Logic', () => {
    it('should simulate sending a message', () => {
      spyOn(console, 'log');
      component.messageText = '  Hello  ';
      component.sendMessage();
      expect(console.log).toHaveBeenCalledWith('Mensaje simulado:', '  Hello  ');
      expect(component.messageText).toBe('');

      component.messageText = '';
      component.sendMessage();
    });

    it('should navigate back to /chats', () => {
      component.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chats']);
    });

    it('should navigate to budgets', () => {
      component.encuentroId = '1';
      component.goToBudgets();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/budgets', '1']);
    });

    it('should not load friends if already loaded or panel closed', () => {
      const loadFriendsSpy = spyOn(component, 'loadFriends');
      component.showAddFriends = true;
      component.friends = [{ id: 1 }];
      component.toggleAddFriends();
      expect(loadFriendsSpy).not.toHaveBeenCalled();

      component.showAddFriends = false;
      component.friends = [];
      component.toggleAddFriends();
      expect(loadFriendsSpy).toHaveBeenCalled();
    });

    it('should toggle detail sections', () => {
      component.showEncuentroDetails = false;
      component.toggleEncuentroDetails();
      expect(component.showEncuentroDetails).toBeTrue();

      component.showParticipantes = false;
      component.toggleParticipantes();
      expect(component.showParticipantes).toBeTrue();
    });

    it('should toggle edit mode correctly', () => {
      component.encuentro = { id: 1, titulo: 'T', idCreador: 100 };
      component.activarEdicion();
      expect(component.isEditing).toBeTrue();
      expect(component.encuentroEditando.titulo).toBe('T');

      component.cancelarEdicion();
      expect(component.isEditing).toBeFalse();
    });

    it('should validate and save encounter edits', () => {
      component.encuentroId = '1';
      component.encuentro = { id: 1, titulo: 'T', idCreador: 100 };
      component.encuentroEditando = {
        titulo: 'New Title',
        descripcion: 'D',
        lugar: 'L',
        fecha: new Date(Date.now() + 86400000).toISOString()
      };

      encuentroServiceSpy.updateEncuentro.and.returnValue(of({ success: true, message: 'Updated', encuentro: {} as any }));

      component.guardarEdicion();

      expect(encuentroServiceSpy.updateEncuentro).toHaveBeenCalled();
    });

    it('should block past dates when saving edits', () => {
      component.encuentroId = '1';
      component.currentUserId = 100;
      component.encuentroEditando = {
        titulo: 'T', descripcion: 'D', lugar: 'L',
        fecha: new Date(Date.now() - 86400000).toISOString()
      };

      component.guardarEdicion();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Fecha inválida' }));
      expect(encuentroServiceSpy.updateEncuentro).not.toHaveBeenCalled();
    });

    it('should validate required fields in guardarEdicion', () => {
      component.currentUserId = 100;
      component.encuentroId = '1';

      component.encuentroEditando.titulo = '';
      component.guardarEdicion();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Campo requerido' }));

      component.encuentroEditando.titulo = 'T';
      component.encuentroEditando.lugar = '';
      component.guardarEdicion();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Campo requerido' }));

      component.encuentroEditando.lugar = 'L';
      component.encuentroEditando.fecha = '';
      component.guardarEdicion();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Campo requerido' }));
    });

    it('should handle update error in guardarEdicion', () => {
      component.currentUserId = 100;
      component.encuentroId = '1';
      component.encuentroEditando = { titulo: 'T', descripcion: 'D', lugar: 'L', fecha: new Date(Date.now() + 864000).toISOString() };
      encuentroServiceSpy.updateEncuentro.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));

      component.guardarEdicion();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Failed' }));
    });

    it('should handle leaving encounter error', fakeAsync(() => {
      component.encuentroId = '1';
      component.encuentro = { id: 1, titulo: 'Test', idCreador: 100 };
      component.currentUserId = 2; // Different user, not creator
      encuentroServiceSpy.salirDelEncuentro.and.returnValue(throwError(() => ({ error: { message: 'Error' } })));
      
      component.salirDelEncuentro();
      flush();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        icon: 'error'
      }));
    }));

    it('should prevent creator from leaving encounter', () => {
      component.encuentroId = '1';
      component.encuentro = { id: 1, titulo: 'Test', idCreador: 100 };
      component.currentUserId = 100; // User is creator
      
      component.salirDelEncuentro();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        title: 'No puedes salir'
      }));
    });

    it('should prevent non-creator from eliminating encounter', () => {
      component.encuentroId = '1';
      component.encuentro = { id: 1, titulo: 'Test', idCreador: 100 };
      component.currentUserId = 2; // User is not creator
      
      component.eliminarEncuentro();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        title: 'No tienes permiso'
      }));
    });

    it('should handle eliminating encounter with confirmation', fakeAsync(() => {
      component.encuentroId = '1';
      component.encuentro = { id: 1, titulo: 'Test', idCreador: 100 };
      component.currentUserId = 100; // User is creator
      encuentroServiceSpy.deleteEncuentro.and.returnValue(of({ success: true, message: 'Deleted' }));
      
      component.eliminarEncuentro();
      flush();
      
      expect(encuentroServiceSpy.deleteEncuentro).toHaveBeenCalledWith(1, 100);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/chats']);
    }));
  });

  describe('Friends and Participants', () => {
    it('should handle loadFriends error', () => {
      component.currentUserId = 100;
      httpSpy.get.and.returnValue(throwError(() => new Error('API Error')));

      component.loadFriends();

      expect(component.loadingFriends).toBeFalse();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error' }));
    });

    it('should normalize friends with all possible property names', () => {
      component.currentUserId = 100;
      const mockFriends = [
        { id: 1, nombre: 'A', apellido: 'B', email: 'E', imagenPerfil: 'I' },
        { ID: 2, NOMBRE: 'C', APELLIDO: 'D', EMAIL: 'F', IMAGEN_PERFIL: 'J' },
        { ID_USUARIO: 3, IMAGENPERFIL: 'K' }
      ];
      httpSpy.get.and.returnValue(of({ success: true, friends: mockFriends }));

      component.loadFriends();

      expect(component.friends[0].id).toBe(1);
      expect(component.friends[1].id).toBe(2);
      expect(component.friends[2].id).toBe(3);
      expect(component.friends[2].imagenPerfil).toBe('K');
    });

    it('should handle error when adding participant', () => {
      component.encuentroId = '1';
      httpSpy.post.and.returnValue(throwError(() => ({ error: { message: 'Too many' } })));
      const friend = { id: 200, nombre: 'F' };

      component.addParticipante(friend);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Too many' }));
    });
  });

  describe('Utility Methods', () => {
    it('formatDate should return formatted date string', () => {
      const date = new Date('2025-01-01T12:00:00');
      const formatted = component.formatDate(date);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('enero');
    });

    it('formatDate should return empty string if no date', () => {
      expect(component.formatDate('')).toBe('');
    });

    it('should correctly identify creator', () => {
      component.encuentro = { idCreador: 100 };
      expect(component.isCreador()).toBeTrue();
      component.encuentro = { idCreador: 999 };
      expect(component.isCreador()).toBeFalse();
    });

    it('getAporteByUsuario should return the total aporte', () => {
      component.participantesAportes = [{ idUsuario: 200, totalAportes: 50 } as any];
      expect(component.getAporteByUsuario(200)).toBe(50);
      expect(component.getAporteByUsuario(300)).toBeNull();
    });
  });
});
