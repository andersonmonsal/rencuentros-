import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService, User, AuthResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    nombre: 'Test',
    apellido: 'User',
    email: 'test@test.com',
    fechaRegistro: new Date()
  };

  const mockAuthResponse: AuthResponse = {
    user: mockUser,
    access_token: 'fake-token'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Constructor', () => {
    it('should load user from localStorage if exists', () => {
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      const http = TestBed.inject(HttpClient);
      const newService = new AuthService(http);
      expect(newService.getCurrentUser()).toEqual(jasmine.objectContaining({ email: 'test@test.com' }));
    });

    it('should handle JSON parse error in constructor', () => {
      spyOn(console, 'error');
      localStorage.setItem('currentUser', 'invalid-json');
      const http = TestBed.inject(HttpClient);
      new AuthService(http);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Registration & Login', () => {
    it('should register and handle authentication', () => {
      service.register('Test', 'test@test.com', 'password', 'User').subscribe(res => {
        expect(res).toEqual(mockAuthResponse);
        expect(localStorage.getItem('access_token')).toBe('fake-token');
        expect(JSON.parse(localStorage.getItem('currentUser')!)).toEqual(jasmine.objectContaining({ email: 'test@test.com' }));
      });

      const req = httpMock.expectOne('http://localhost:3000/auth/register');
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('should login and handle authentication', () => {
      service.login('test@test.com', 'password').subscribe(res => {
        expect(res).toEqual(mockAuthResponse);
        expect(localStorage.getItem('isLogged')).toBe('true');
      });

      const req = httpMock.expectOne('http://localhost:3000/auth/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });
  });

  describe('Logout', () => {
    it('should clean up localStorage and currentUserSubject', () => {
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('currentUser', 'user');
      service.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('Helpers', () => {
    it('should return token', () => {
      localStorage.setItem('access_token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should validate status', () => {
      localStorage.setItem('access_token', 'token');
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should validate token via HTTP', () => {
      service.validateToken().subscribe(res => {
        expect(res).toBeTruthy();
      });
      const req = httpMock.expectOne('http://localhost:3000/auth/validate');
      req.flush({ valid: true });
    });
  });

  describe('Password Flow', () => {
    it('should call forgotPassword', () => {
      service.forgotPassword('test@test.com').subscribe(res => {
        expect(res.message).toBe('Email sent');
      });
      const req = httpMock.expectOne('http://localhost:3000/auth/forgot-password');
      req.flush({ message: 'Email sent' });
    });

    it('should call resetPassword', () => {
      service.resetPassword('token', 'new-pwd').subscribe(res => {
        expect(res.message).toBe('Success');
      });
      const req = httpMock.expectOne('http://localhost:3000/auth/reset-password');
      req.flush({ message: 'Success' });
    });
  });
});
