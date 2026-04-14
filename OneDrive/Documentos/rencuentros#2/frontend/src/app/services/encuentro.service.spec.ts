import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EncuentroService, Encuentro, CreateEncuentroDto } from './encuentro.service';

describe('EncuentroService', () => {
  let service: EncuentroService;
  let httpMock: HttpTestingController;
  const API_URL = 'http://localhost:3000/encuentro';

  const mockEncuentros: Encuentro[] = [
    { id: 1, titulo: 'Meeting 1', lugar: 'Room A', fecha: new Date() },
    { id: 2, titulo: 'Meeting 2', lugar: 'Room B', fecha: new Date() }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EncuentroService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EncuentroService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get encuentros by creator', () => {
    service.getEncuentros(123).subscribe(res => {
      expect(res).toEqual(mockEncuentros);
    });
    const req = httpMock.expectOne(`${API_URL}/resumen?creador=123`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEncuentros);
  });

  it('should get a single encuentro', () => {
    service.getEncuentro(1).subscribe(res => {
      expect(res).toEqual(mockEncuentros[0]);
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    req.flush(mockEncuentros[0]);
  });

  it('should create an encounter', () => {
    const newEncuentro: CreateEncuentroDto = { idCreador: 1, titulo: 'New', descripcion: 'Desc', lugar: 'Home', fecha: new Date() };
    service.createEncuentro(newEncuentro).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
  });

  it('should update an encounter', () => {
    service.updateEncuentro(1, { titulo: 'Updated' }, 123).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ titulo: 'Updated', idUsuario: 123 });
    req.flush({ success: true, message: 'Updated', encuentro: { ...mockEncuentros[0], titulo: 'Updated' } });
  });

  it('should allow user to exit an encounter', () => {
    service.salirDelEncuentro(1, 456).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${API_URL}/1/salir`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idUsuario: 456 });
    req.flush({ success: true, message: 'Exited' });
  });

  it('should delete an encounter', () => {
    service.deleteEncuentro(1, 123).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ idUsuario: 123 });
    req.flush({ success: true, message: 'Deleted' });
  });
});
