import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Encuentro {
  id: number;
  idCreador?: number;
  titulo: string;
  descripcion?: string;
  lugar: string;
  fecha: string | Date | null;
  fechaCreacion?: string | Date | null;
  idPresupuesto?: number | null;
  presupuestoTotal?: number;
  cantParticipantes?: number;
}

export interface CreateEncuentroDto {
  idCreador: number;
  titulo: string;
  descripcion: string;
  lugar: string;
  fecha: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EncuentroService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/encuentro';

  /**
   * Obtiene todos los encuentros del usuario (como creador o participante)
   */
  getEncuentros(creadorId: number): Observable<Encuentro[]> {
    return this.http.get<Encuentro[]>(`${this.API_URL}/resumen?creador=${creadorId}`);
  }

  /**
   * Obtiene un encuentro específico por ID
   */
  getEncuentro(id: number): Observable<Encuentro> {
    return this.http.get<Encuentro>(`${this.API_URL}/${id}`);
  }

  /**
   * Crea un nuevo encuentro
   */
  createEncuentro(data: CreateEncuentroDto): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(this.API_URL, data);
  }

  /**
   * Actualiza un encuentro existente (solo el creador)
   */
  updateEncuentro(idEncuentro: number, data: Partial<CreateEncuentroDto>, idUsuario: number): Observable<{success: boolean, message: string, encuentro: Encuentro}> {
    return this.http.patch<{success: boolean, message: string, encuentro: Encuentro}>(
      `${this.API_URL}/${idEncuentro}`,
      { ...data, idUsuario }
    );
  }

  /**
   * Permite que un usuario salga de un encuentro
   * El creador NO puede salir de su propio encuentro
   */
  salirDelEncuentro(idEncuentro: number, idUsuario: number): Observable<{success: boolean, message: string}> {
    return this.http.post<{success: boolean, message: string}>(
      `${this.API_URL}/${idEncuentro}/salir`,
      { idUsuario }
    );
  }

  /**
   * Elimina un encuentro (solo el creador)
   */
  deleteEncuentro(idEncuentro: number, idUsuario: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(
      `${this.API_URL}/${idEncuentro}`,
      { body: { idUsuario } }
    );
  }
}
