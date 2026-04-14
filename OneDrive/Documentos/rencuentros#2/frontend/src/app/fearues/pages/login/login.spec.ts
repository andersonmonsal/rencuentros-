import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { Login } from './login';
import { AuthService } from '../../../services/auth.service';

describe('Login Component', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    
    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
    
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should be invalid when empty', () => {
      expect(component.loginForm.valid).toBeFalse();
    });

    it('should invalidate email format', () => {
      const email = component.loginForm.controls['email'];
      email.setValue('invalid-email');
      expect(email.errors?.['email']).toBeTruthy();
    });

    it('should require email', () => {
      const email = component.loginForm.controls['email'];
      email.setValue('');
      expect(email.errors?.['required']).toBeTruthy();
    });

    it('should validate password length', () => {
      const password = component.loginForm.controls['password'];
      password.setValue('1234567'); // Less than 8
      expect(password.errors?.['minlength']).toBeTruthy();
    });

    it('should be valid with correct inputs', () => {
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      expect(component.loginForm.valid).toBeTrue();
    });
  });

  describe('onLogin', () => {
    it('should not call authService if form is invalid', () => {
      component.loginForm.controls['email'].setValue('invalid');
      component.onLogin();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should call authService.login and navigate on success', () => {
      const loginResponse = { 
        access_token: 'mock-token', 
        user: { 
          id: 1, 
          email: 'test@example.com',
          nombre: 'Test User',
          fechaRegistro: new Date()
        } 
      };
      authServiceSpy.login.and.returnValue(of(loginResponse as any));
      
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      
      component.onLogin();
      
      expect(authServiceSpy.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should show error with Swal on login failure', fakeAsync(() => {
      const errorResponse = { 
        error: { message: 'Invalid credentials' } 
      };
      authServiceSpy.login.and.returnValue(throwError(() => errorResponse));
      
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      
      component.onLogin();
      flush();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        icon: 'error',
        text: 'Invalid credentials'
      }));
    }));

    it('should use default error message if error.message is missing', fakeAsync(() => {
      authServiceSpy.login.and.returnValue(throwError(() => ({ error: {} })));
      
      component.loginForm.controls['email'].setValue('test@example.com');
      component.loginForm.controls['password'].setValue('password123');
      
      component.onLogin();
      flush();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        text: 'Credenciales inválidas'
      }));
    }));
  });

  describe('Getters', () => {
    it('should return email controller', () => {
      expect(component.email).toBe(component.loginForm.get('email'));
    });

    it('should return password controller', () => {
      expect(component.password).toBe(component.loginForm.get('password'));
    });
  });
});
