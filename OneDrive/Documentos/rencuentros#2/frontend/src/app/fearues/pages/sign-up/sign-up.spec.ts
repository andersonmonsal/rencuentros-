import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { SignUp } from './sign-up';
import { AuthService } from '../../../services/auth.service';

describe('SignUp Component', () => {
  let component: SignUp;
  let fixture: ComponentFixture<SignUp>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Mock SweetAlert2 globally
    if (jasmine.isSpy(Swal.fire)) {
      (Swal.fire as jasmine.Spy).and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    } else {
      spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true } as any));
    }

    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    
    await TestBed.configureTestingModule({
      imports: [SignUp, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
    
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(routerSpy, 'navigate');
    
    fixture = TestBed.createComponent(SignUp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should be invalid when empty', () => {
      expect(component.signUpForm.valid).toBeFalse();
    });

    it('should require all fields', () => {
      const controls = component.signUpForm.controls;
      expect(controls['nombre'].errors?.['required']).toBeTruthy();
      expect(controls['apellido'].errors?.['required']).toBeTruthy();
      expect(controls['email'].errors?.['required']).toBeTruthy();
      expect(controls['contrasena'].errors?.['required']).toBeTruthy();
      expect(controls['confirmPassword'].errors?.['required']).toBeTruthy();
    });

    it('should validate email format', () => {
      component.signUpForm.controls['email'].setValue('invalid');
      expect(component.signUpForm.controls['email'].errors?.['email']).toBeTruthy();
    });

    it('should validate password minimum length', () => {
      component.signUpForm.controls['contrasena'].setValue('123');
      expect(component.signUpForm.controls['contrasena'].errors?.['minlength']).toBeTruthy();
    });

    it('should be valid when filled correctly', () => {
      component.signUpForm.setValue({
        nombre: 'Jose',
        apellido: 'Perez',
        email: 'jose@test.com',
        contrasena: 'password123',
        confirmPassword: 'password123'
      });
      expect(component.signUpForm.valid).toBeTrue();
    });
  });

  describe('onSignUp', () => {
    it('should not call authService if form is invalid', () => {
      component.onSignUp();
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should show warning if passwords do not match', () => {
      component.signUpForm.setValue({
        nombre: 'Jose',
        apellido: 'Perez',
        email: 'jose@test.com',
        contrasena: 'password123',
        confirmPassword: 'password456'
      });
      
      component.onSignUp();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        icon: 'warning',
        title: 'Contraseñas no coinciden'
      }));
      expect(authServiceSpy.register).not.toHaveBeenCalled();
    });

    it('should call authService.register and navigate on success', fakeAsync(() => {
      const mockResponse = {
        access_token: 'token',
        user: { id: 1, nombre: 'Jose', email: 'jose@test.com', fechaRegistro: new Date() }
      };
      authServiceSpy.register.and.returnValue(of(mockResponse as any));
      
      component.signUpForm.setValue({
        nombre: 'Jose',
        apellido: 'Perez',
        email: 'jose@test.com',
        contrasena: 'password123',
        confirmPassword: 'password123'
      });
      
      component.onSignUp();
      flush();
      
      expect(authServiceSpy.register).toHaveBeenCalledWith('Jose', 'jose@test.com', 'password123', 'Perez');
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        icon: 'success',
        title: 'Cuenta creada'
      }));
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    }));

    it('should show error modal on registration failure', fakeAsync(() => {
      const errorResponse = { error: { message: 'Email already exists' } };
      authServiceSpy.register.and.returnValue(throwError(() => errorResponse));
      
      component.signUpForm.setValue({
        nombre: 'Jose',
        apellido: 'Perez',
        email: 'jose@test.com',
        contrasena: 'password123',
        confirmPassword: 'password123'
      });
      
      component.onSignUp();
      flush();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        icon: 'error',
        text: 'Email already exists'
      }));
    }));

    it('should show default error message if error payload is empty', fakeAsync(() => {
      authServiceSpy.register.and.returnValue(throwError(() => ({ error: {} })));
      
      component.signUpForm.setValue({
        nombre: 'Jose',
        apellido: 'Perez',
        email: 'jose@test.com',
        contrasena: 'password123',
        confirmPassword: 'password123'
      });
      
      component.onSignUp();
      flush();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
        text: 'Hubo un problema al crear tu cuenta'
      }));
    }));
  });

  describe('Getters', () => {
    it('should return all form controls via getters', () => {
      expect(component.nombre).toBe(component.signUpForm.get('nombre'));
      expect(component.apellido).toBe(component.signUpForm.get('apellido'));
      expect(component.email).toBe(component.signUpForm.get('email'));
      expect(component.contrasena).toBe(component.signUpForm.get('contrasena'));
      expect(component.confirmPassword).toBe(component.signUpForm.get('confirmPassword'));
    });
  });
});
