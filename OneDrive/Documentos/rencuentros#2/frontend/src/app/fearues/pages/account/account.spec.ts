import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Account } from './account';
import { AuthService } from '../../../services/auth.service';

describe('Account Component', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let httpMock: HttpTestingController;
  let mockLocalStorage: { [key: string]: string } = {};

  beforeEach(async () => {
    mockLocalStorage = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => mockLocalStorage[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete mockLocalStorage[key];
    });

    if (jasmine.isSpy(Swal.fire)) {
       (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
       spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);

    await TestBed.configureTestingModule({
      imports: [Account, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no pending requests
  });

  describe('Initialization', () => {
    it('should redirect to login if no user and not logged in', () => {
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
      fixture.detectChanges();
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should catch JSON parse error in constructor but not redirect if isLogged', () => {
      mockLocalStorage['user'] = 'invalid-json';
      mockLocalStorage['isLogged'] = 'true';
      spyOn(console, 'warn');
      
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(console.warn).toHaveBeenCalledWith('Error parseando user desde localStorage', jasmine.any(SyntaxError));
      expect(component.name).toBe('');
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should populate user data from localStorage', () => {
      mockLocalStorage['user'] = JSON.stringify({ nombre: 'Juan', apellido: 'Perez', email: 'juan@test.com' });
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.name).toBe('Juan Perez');
      expect(component.email).toBe('juan@test.com');
      expect(component.apellido).toBe('Perez');
      expect(component.initials).toBe('JP');
      expect(component.profileForm.value).toEqual({ nombre: 'Juan', apellido: 'Perez' });
    });
  });

  describe('onLogout', () => {
    beforeEach(() => {
      mockLocalStorage['isLogged'] = 'true';
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
    });

    it('should call authService.logout, Swal, and navigate', fakeAsync(() => {
      component.onLogout();
      flush();

      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Sesión cerrada' }));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    }));
  });

  describe('saveProfile', () => {
    beforeEach(() => {
      mockLocalStorage['user'] = JSON.stringify({ nombre: 'John', email: 'john@test.com' });
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
    });

    it('should abort if email is empty', () => {
      component.email = '';
      component.saveProfile();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error', text: 'Email de usuario no disponible' }));
    });

    it('should update profile and update localStorage on success', () => {
      component.profileForm.setValue({ nombre: 'Johnny', apellido: 'Doe' });
      component.saveProfile();

      const req = httpMock.expectOne('http://localhost:3000/users/update');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'john@test.com', updateData: { nombre: 'Johnny', apellido: 'Doe' } });

      req.flush({ success: true, user: { nombre: 'Johnny', apellido: 'Doe', email: 'john@test.com' } });

      expect(component.name).toBe('Johnny Doe');
      expect(JSON.parse(mockLocalStorage['user']).nombre).toBe('Johnny');
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Guardado' }));
    });

    it('should show error modal if success is false', () => {
      component.saveProfile();
      const req = httpMock.expectOne('http://localhost:3000/users/update');
      req.flush({ success: false, message: 'Invalid data' });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Invalid data' }));
    });

    it('should handle HTTP error gracefully', () => {
      spyOn(console, 'error');
      component.saveProfile();
      const req = httpMock.expectOne('http://localhost:3000/users/update');
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      expect(console.error).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Error al actualizar los datos' }));
    });
  });

  describe('updatePassword', () => {
    beforeEach(() => {
      mockLocalStorage['user'] = JSON.stringify({ nombre: 'Jane', email: 'jane@test.com' });
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
    });

    it('should abort if email is empty', () => {
      component.email = '';
      component.updatePassword();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Email de usuario no disponible' }));
    });

    it('should abort if fields are incomplete', () => {
      component.passwordForm.setValue({ actual: 'pwd', nueva: '', confirm: '' });
      component.updatePassword();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Campos incompletos' }));
    });

    it('should abort if new password is too short', () => {
      component.passwordForm.setValue({ actual: 'pwd', nueva: '12345', confirm: '12345' });
      component.updatePassword();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Contraseña débil' }));
    });

    it('should abort if passwords do not match', () => {
      component.passwordForm.setValue({ actual: 'pwd', nueva: '123456', confirm: '1234567' });
      component.updatePassword();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Contraseñas no coinciden' }));
    });

    it('should update password and handle success response', () => {
      component.passwordForm.setValue({ actual: 'oldpwd', nueva: 'newpwd123', confirm: 'newpwd123' });
      component.updatePassword();

      const req = httpMock.expectOne('http://localhost:3000/users/updatePassword');
      expect(req.request.method).toBe('POST');
      req.flush({ success: true, user: { nombre: 'Jane' } }); // Simulate backend returning stripped user
      
      expect(component.passwordForm.value).toEqual({ actual: null, nueva: null, confirm: null });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Contraseña actualizada' }));
      expect(JSON.parse(mockLocalStorage['user']).nombre).toBe('Jane');
    });

    it('should show error if success is false on updatePassword', () => {
      component.passwordForm.setValue({ actual: 'old', nueva: 'newpwd123', confirm: 'newpwd123' });
      component.updatePassword();
      const req = httpMock.expectOne('http://localhost:3000/users/updatePassword');
      req.flush({ success: false, message: 'Wrong current password' });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'Wrong current password' }));
    });

    it('should handle HTTP error on updatePassword', () => {
      spyOn(console, 'error');
      component.passwordForm.setValue({ actual: 'old', nueva: 'newpwd123', confirm: 'newpwd123' });
      component.updatePassword();
      const req = httpMock.expectOne('http://localhost:3000/users/updatePassword');
      req.flush({ message: 'HTTP 500' }, { status: 500, statusText: 'Error' });
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'HTTP 500' }));
    });
  });

  describe('computeInitials', () => {
    beforeEach(() => {
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
    });

    it('should return correct initials from name and surname', () => {
      expect(component.computeInitials('Alejandro', 'Gutierrez')).toBe('AG');
    });

    it('should handle missing surname', () => {
      expect(component.computeInitials('Pedro', '')).toBe('P');
    });

    it('should handle missing name', () => {
      expect(component.computeInitials('', 'Perez')).toBe('P');
    });

    it('should fallback to U if both are missing', () => {
      expect(component.computeInitials('', '')).toBe('U');
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      mockLocalStorage['user'] = JSON.stringify({ email: 'test@test.com' });
      fixture = TestBed.createComponent(Account);
      component = fixture.componentInstance;
    });

    it('should abort if user cancels Swal', fakeAsync(() => {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: false } as any));
      component.deleteAccount();
      flush();
      httpMock.expectNone('http://localhost:3000/users/delete');
    }));

    it('should delete account, clean localStorage, and navigate to home on success', fakeAsync(() => {
      component.deleteAccount();
      flush();

      const req = httpMock.expectOne('http://localhost:3000/users/delete');
      req.flush({ success: true });

      expect(mockLocalStorage['user']).toBeUndefined();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Cuenta eliminada' }));
    }));

    it('should handle failure on deleteAccount', fakeAsync(() => {
      component.deleteAccount();
      flush();
      
      const req = httpMock.expectOne('http://localhost:3000/users/delete');
      req.flush({ success: false, message: 'No se puede eliminar' });
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ text: 'No se puede eliminar' }));
    }));

    it('should handle HTTP error on deleteAccount', fakeAsync(() => {
      spyOn(console, 'error');
      component.deleteAccount();
      flush();
      
      const req = httpMock.expectOne('http://localhost:3000/users/delete');
      req.flush('Server Error', { status: 500, statusText: 'Error' });
      
      expect(console.error).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Error' }));
    }));
  });
});
