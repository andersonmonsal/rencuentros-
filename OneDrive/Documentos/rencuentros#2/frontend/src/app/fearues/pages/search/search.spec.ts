import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Search } from './search';
import { FriendshipService } from '../../../modules/amistades/friendship.service';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import Swal from 'sweetalert2';

describe('Search Component', () => {
  let component: Search;
  let fixture: ComponentFixture<Search>;
  let friendshipServiceSpy: jasmine.SpyObj<FriendshipService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('FriendshipService', ['searchUsers', 'sendFriendRequest']);

    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        { provide: FriendshipService, useValue: spy },
        provideRouter([])
      ]
    }).compileComponents();

    friendshipServiceSpy = TestBed.inject(FriendshipService) as jasmine.SpyObj<FriendshipService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'user') return JSON.stringify({ id: 123, name: 'Test User' });
      return null;
    });
    // Re-run constructor logic if needed or just set currentUserId
    component.currentUserId = 123;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('doSearch', () => {
    it('should clear results if searchTerm is empty', () => {
      component.searchTerm = '   ';
      component.results = [{ id: 1 }];
      component.doSearch();
      expect(component.results.length).toBe(0);
    });

    it('should call friendshipService.searchUsers after debounce', fakeAsync(() => {
      const mockResults = [{ id: 456, name: 'Found User' }];
      friendshipServiceSpy.searchUsers.and.returnValue(of(mockResults));

      component.searchTerm = 'findme';
      component.doSearch();

      expect(friendshipServiceSpy.searchUsers).not.toHaveBeenCalled();
      
      tick(350); // wait for debounce
      
      expect(friendshipServiceSpy.searchUsers).toHaveBeenCalledWith('findme', 123);
      expect(component.results).toEqual(mockResults);
      expect(component.loading).toBeFalse();
    }));

    it('should handle search error', fakeAsync(() => {
      friendshipServiceSpy.searchUsers.and.returnValue(throwError(() => new Error('Search failed')));

      component.searchTerm = 'error';
      component.doSearch();
      tick(350);

      expect(component.error).toBeTrue();
      expect(component.errorMsg).toContain('Error buscando usuarios');
      expect(component.results.length).toBe(0);
      expect(component.loading).toBeFalse();
    }));
  });

  describe('sendRequest', () => {
    beforeEach(() => {
      spyOn(Swal, 'fire').and.returnValue({ isConfirmed: true } as any);
    });

    it('should show warning if not logged in', () => {
      component.currentUserId = null;
      component.sendRequest(456);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'warning' }));
      expect(friendshipServiceSpy.sendFriendRequest).not.toHaveBeenCalled();
    });

    it('should not send request to self', () => {
      component.sendRequest(123);
      expect(friendshipServiceSpy.sendFriendRequest).not.toHaveBeenCalled();
    });

    it('should check if request is already pending in the local set', () => {
      component.requestsSent.add(456);
      component.sendRequest(456);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Solicitud pendiente' }));
      expect(friendshipServiceSpy.sendFriendRequest).not.toHaveBeenCalled();
    });

    it('should call friendshipService.sendFriendRequest and show success', () => {
      friendshipServiceSpy.sendFriendRequest.and.returnValue(of({}));
      component.results = [{ id: 456, name: 'User' }];

      component.sendRequest(456);

      expect(friendshipServiceSpy.sendFriendRequest).toHaveBeenCalledWith(123, 456);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'success' }));
      expect(component.results[0].pendingRequestFromMe).toBeTrue();
    });

    it('should handle error when sending request', () => {
      const errorResponse = { error: { message: 'Already friends' } };
      friendshipServiceSpy.sendFriendRequest.and.returnValue(throwError(() => errorResponse));

      component.sendRequest(456);

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Already friends' }));
      expect(component.requestsSent.has(456)).toBeFalse();
    });

    it('should block if already friends or pending', () => {
      component.results = [{ id: 456, isFriend: true }];
      component.sendRequest(456);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Ya son amigos' }));
      
      component.results = [{ id: 789, pendingRequestFromMe: true }];
      component.sendRequest(789);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ title: 'Solicitud ya enviada' }));
    });
  });
});
