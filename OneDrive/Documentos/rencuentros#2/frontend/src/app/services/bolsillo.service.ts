import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bolsillo {
  id: number;
  idPresupuesto: number;
  idEncuentro: number;
  nombre: string;
  saldoActual: number;
}

export interface CreateBolsilloDto {
  idPresupuesto: number;
  idEncuentro: number;
  nombre: string;
  saldoActual?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BolsilloService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/bolsillo';

  /**
   * Obtiene todos los bolsillos
   */
  getBolsillos(): Observable<Bolsillo[]> {
    return this.http.get<Bolsillo[]>(this.API_URL);
  }

  /**
   * Obtiene un bolsillo por ID
   */
  getBolsillo(id: number): Observable<Bolsillo> {
    return this.http.get<Bolsillo>(`${this.API_URL}/${id}`);
  }

  /**
   * Obtiene los bolsillos de un encuentro
   */
  getBolsillosByEncuentro(idEncuentro: number): Observable<Bolsillo[]> {
    return this.http.get<Bolsillo[]>(`${this.API_URL}?encuentro=${idEncuentro}`);
  }

  /**
   * Obtiene los bolsillos de un presupuesto
   */
  getBolsillosByPresupuesto(idPresupuesto: number): Observable<Bolsillo[]> {
    return this.http.get<Bolsillo[]>(`${this.API_URL}?presupuesto=${idPresupuesto}`);
  }

  /**
   * Crea un nuevo bolsillo
   */
  crearBolsillo(bolsillo: CreateBolsilloDto): Observable<Bolsillo> {
    return this.http.post<Bolsillo>(this.API_URL, bolsillo);
  }

  /**
   * Actualiza un bolsillo existente
   */
  actualizarBolsillo(id: number, bolsillo: Partial<CreateBolsilloDto>): Observable<Bolsillo> {
    return this.http.patch<Bolsillo>(`${this.API_URL}/${id}`, bolsillo);
  }

  /**
   * Elimina un bolsillo
   * Solo el creador del encuentro puede hacerlo
   * No se puede eliminar si tiene aportes asociados
   */
  eliminarBolsillo(id: number, idUsuario: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(
      `${this.API_URL}/${id}`,
      { body: { idUsuario } }
    );
  }
}
