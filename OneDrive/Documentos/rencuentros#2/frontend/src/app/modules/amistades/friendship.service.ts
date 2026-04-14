import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FriendshipService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/users';

  searchUsers(query: string, currentUserId: number | null): Observable<any> {
    const q = encodeURIComponent(query);
    const currentParam = currentUserId ? `&currentUser=${currentUserId}` : '';
    return this.http.get<any>(`${this.apiUrl}/search_user?q=${q}${currentParam}`);
  }

  sendFriendRequest(fromId: number, toId: number): Observable<any> {
    const payload = { from: fromId, to: toId };
    return this.http.post(`${this.apiUrl}/friend-request`, payload);
  }

  getNotifications(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notifications?userId=${userId}`);
  }

  acceptRequest(id_relacion: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/accept-request`, {
      id_relacion_amistad: id_relacion,
      userId: userId
    });
  }

  rejectRequest(id_relacion: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reject-request`, {
      id_relacion_amistad: id_relacion,
      userId: userId
    });
  }
}
