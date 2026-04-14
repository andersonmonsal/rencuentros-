import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ItemPresupuesto {
  id: number;
  idPresupuesto: number;
  idEncuentro: number;
  nombreItem: string;
  montoItem: number;
}

export interface Presupuesto {
  id: number;
  idEncuentro: number;
  presupuestoTotal: number;
  items?: ItemPresupuesto[];
}

export interface CreateItemPresupuestoDto {
  idPresupuesto: number;
  idEncuentro: number;
  nombreItem: string;
  montoItem: number;
}

@Injectable({
  providedIn: 'root'
})
export class PresupuestoService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/presupuesto';

  /**
   * Obtiene un presupuesto por ID
   */
  getPresupuesto(id: number): Observable<Presupuesto> {
    return this.http.get<Presupuesto>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene el presupuesto de un encuentro
   */
  getPresupuestoByEncuentro(idEncuentro: number): Observable<Presupuesto> {
    return this.http.get<Presupuesto>(`${this.API_URL}?encuentro=${idEncuentro}`);
  }

  /**
   * Obtiene los items de un presupuesto
   */
  getItems(idPresupuesto: number): Observable<ItemPresupuesto[]> {
    return this.http.get<ItemPresupuesto[]>(`${this.API_URL}/${idPresupuesto}/items`);
  }

  /**
   * Agrega un nuevo item al presupuesto
   */
  agregarItem(item: CreateItemPresupuestoDto): Observable<ItemPresupuesto> {
    return this.http.post<ItemPresupuesto>(`${this.API_URL}/item`, item);
  }

  /**
   * Elimina un item del presupuesto y actualiza el total
   * Solo el creador del encuentro puede hacerlo
   */
  eliminarItem(idItem: number, idUsuario: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(
      `${this.API_URL}/item/${idItem}`,
      { body: { idUsuario } }
    );
  }
}
