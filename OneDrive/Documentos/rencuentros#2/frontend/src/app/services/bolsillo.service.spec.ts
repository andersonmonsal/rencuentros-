import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BolsilloService, Bolsillo, CreateBolsilloDto } from './bolsillo.service';

describe('BolsilloService', () => {
  let service: BolsilloService;
  let httpMock: HttpTestingController;
  const API_URL = 'http://localhost:3000/bolsillo';

  const mockBolsillos: Bolsillo[] = [
    { id: 1, idPresupuesto: 10, idEncuentro: 20, nombre: 'Bolsillo 1', saldoActual: 100 },
    { id: 2, idPresupuesto: 10, idEncuentro: 20, nombre: 'Bolsillo 2', saldoActual: 200 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BolsilloService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BolsilloService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all bolsillos', () => {
    service.getBolsillos().subscribe(res => {
      expect(res).toEqual(mockBolsillos);
    });
    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');
    req.flush(mockBolsillos);
  });

  it('should get a single bolsillo', () => {
    service.getBolsillo(1).subscribe(res => {
      expect(res).toEqual(mockBolsillos[0]);
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    req.flush(mockBolsillos[0]);
  });

  it('should get bolsillos by encuentro', () => {
    service.getBolsillosByEncuentro(20).subscribe(res => {
      expect(res).toEqual(mockBolsillos);
    });
    const req = httpMock.expectOne(`${API_URL}?encuentro=20`);
    req.flush(mockBolsillos);
  });

  it('should get bolsillos by presupuesto', () => {
    service.getBolsillosByPresupuesto(10).subscribe(res => {
      expect(res).toEqual(mockBolsillos);
    });
    const req = httpMock.expectOne(`${API_URL}?presupuesto=10`);
    req.flush(mockBolsillos);
  });

  it('should create a pocket', () => {
    const newBolsillo: CreateBolsilloDto = { idPresupuesto: 10, idEncuentro: 20, nombre: 'New' };
    service.crearBolsillo(newBolsillo).subscribe(res => {
      expect(res.nombre).toBe('New');
    });
    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ ...newBolsillo, id: 3, saldoActual: 0 });
  });

  it('should update a pocket', () => {
    service.actualizarBolsillo(1, { nombre: 'Updated' }).subscribe(res => {
      expect(res.nombre).toBe('Updated');
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockBolsillos[0], nombre: 'Updated' });
  });

  it('should delete a pocket', () => {
    service.eliminarBolsillo(1, 99).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ idUsuario: 99 });
    req.flush({ success: true, message: 'Deleted' });
  });
});
