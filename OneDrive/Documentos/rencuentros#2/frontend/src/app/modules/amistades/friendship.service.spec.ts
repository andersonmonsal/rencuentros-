import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FriendshipService } from './friendship.service';

describe('FriendshipService', () => {
  let service: FriendshipService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/users';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FriendshipService]
    });
    service = TestBed.inject(FriendshipService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchUsers', () => {
    it('should search users with query and currentUserId (AAA Pattern)', () => {
      // Arrange
      const query = 'test';
      const currentUserId = 1;
      const mockResponse = [{ id: 2, name: 'User 2' }];

      // Act
      service.searchUsers(query, currentUserId).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/search_user?q=test&currentUser=1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should search users without currentUserId', () => {
      // Arrange
      const query = 'test';
      const mockResponse = [{ id: 2, name: 'User 2' }];

      // Act
      service.searchUsers(query, null).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/search_user?q=test`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send a friend request (AAA Pattern)', () => {
      // Arrange
      const fromId = 1;
      const toId = 2;
      const mockResponse = { success: true };

      // Act
      service.sendFriendRequest(fromId, toId).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/friend-request`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ from: fromId, to: toId });
      req.flush(mockResponse);
    });
  });

  describe('getNotifications', () => {
    it('should get notifications (AAA Pattern)', () => {
      // Arrange
      const userId = 1;
      const mockResponse = { pending: [], accepted: [] };

      // Act
      service.getNotifications(userId).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/notifications?userId=1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('acceptRequest', () => {
    it('should accept a request (AAA Pattern)', () => {
      // Arrange
      const id_relacion = 10;
      const userId = 1;
      const mockResponse = { success: true };

      // Act
      service.acceptRequest(id_relacion, userId).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/accept-request`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ id_relacion_amistad: id_relacion, userId: userId });
      req.flush(mockResponse);
    });
  });

  describe('rejectRequest', () => {
    it('should reject a request (AAA Pattern)', () => {
      // Arrange
      const id_relacion = 10;
      const userId = 1;
      const mockResponse = { success: true };

      // Act
      service.rejectRequest(id_relacion, userId).subscribe(res => {
        // Assert
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/reject-request`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ id_relacion_amistad: id_relacion, userId: userId });
      req.flush(mockResponse);
    });
  });
});
