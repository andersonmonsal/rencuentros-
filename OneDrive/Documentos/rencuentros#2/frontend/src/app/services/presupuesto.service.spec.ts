import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PresupuestoService, Presupuesto, ItemPresupuesto, CreateItemPresupuestoDto } from './presupuesto.service';

describe('PresupuestoService', () => {
  let service: PresupuestoService;
  let httpMock: HttpTestingController;
  const API_URL = 'http://localhost:3000/presupuesto';

  const mockPresupuesto: Presupuesto = {
    id: 1,
    idEncuentro: 20,
    presupuestoTotal: 500,
    items: [
      { id: 1, idPresupuesto: 1, idEncuentro: 20, nombreItem: 'Item 1', montoItem: 100 }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PresupuestoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(PresupuestoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get a budget by ID', () => {
    service.getPresupuesto(1).subscribe(res => {
      expect(res).toEqual(mockPresupuesto);
    });
    const req = httpMock.expectOne(`${API_URL}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPresupuesto);
  });

  it('should get a budget by encounter', () => {
    service.getPresupuestoByEncuentro(20).subscribe(res => {
      expect(res).toEqual(mockPresupuesto);
    });
    const req = httpMock.expectOne(`${API_URL}?encuentro=20`);
    req.flush(mockPresupuesto);
  });

  it('should get items of a budget', () => {
    service.getItems(1).subscribe(res => {
      expect(res).toEqual(mockPresupuesto.items!);
    });
    const req = httpMock.expectOne(`${API_URL}/1/items`);
    req.flush(mockPresupuesto.items!);
  });

  it('should add an item to budget', () => {
    const newItem: CreateItemPresupuestoDto = { idPresupuesto: 1, idEncuentro: 20, nombreItem: 'New', montoItem: 50 };
    service.agregarItem(newItem).subscribe(res => {
      expect(res.nombreItem).toBe('New');
    });
    const req = httpMock.expectOne(`${API_URL}/item`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...newItem, id: 2 });
  });

  it('should delete an item from budget', () => {
    service.eliminarItem(1, 123).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    const req = httpMock.expectOne(`${API_URL}/item/1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ idUsuario: 123 });
    req.flush({ success: true, message: 'Deleted' });
  });
});
