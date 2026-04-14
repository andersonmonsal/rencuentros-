import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Notifications } from './notifications';
import { FriendshipService } from '../../../modules/amistades/friendship.service';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';

describe('Notifications Component', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;
  let friendshipServiceSpy: jasmine.SpyObj<FriendshipService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('FriendshipService', ['getNotifications', 'acceptRequest', 'rejectRequest']);

    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        { provide: FriendshipService, useValue: spy },
        provideRouter([])
      ]
    })
    .compileComponents();

    friendshipServiceSpy = TestBed.inject(FriendshipService) as jasmine.SpyObj<FriendshipService>;
  });

  beforeEach(() => {
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'user') return JSON.stringify({ id: 123 });
      return null;
    });

    // Initialize spies with default observables to avoid constructor errors
    friendshipServiceSpy.getNotifications.and.returnValue(of({ pending: [], accepted: [] }));
    friendshipServiceSpy.acceptRequest.and.returnValue(of({}));
    friendshipServiceSpy.rejectRequest.and.returnValue(of({}));

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    friendshipServiceSpy.getNotifications.and.returnValue(of({ pending: [], accepted: [] }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('loadNotifications', () => {
    it('should load notifications on init', () => {
      const mockRes = { pending: [{ id_relacion: 1 }], accepted: [{ id_relacion: 2 }] };
      friendshipServiceSpy.getNotifications.and.returnValue(of(mockRes));
      
      component.loadNotifications();
      
      expect(friendshipServiceSpy.getNotifications).toHaveBeenCalledWith(123);
      expect(component.notifications.length).toBe(1);
      expect(component.accepted.length).toBe(1);
      expect(component.loading).toBeFalse();
    });

    it('should handle error loading notifications', () => {
      spyOn(Swal, 'fire').and.returnValue({ isConfirmed: true } as any);
      friendshipServiceSpy.getNotifications.and.returnValue(throwError(() => new Error('Fail')));
      
      component.loadNotifications();
      
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error' }));
      expect(component.loading).toBeFalse();
    });
  });

  describe('accept', () => {
    beforeEach(() => {
      spyOn(Swal, 'fire').and.returnValue({ isConfirmed: true } as any);
      component.notifications = [{ id_relacion: 10 }];
    });

    it('should call acceptRequest and reload', () => {
      friendshipServiceSpy.acceptRequest.and.returnValue(of({}));
      friendshipServiceSpy.getNotifications.and.returnValue(of({ pending: [], accepted: [] }));

      component.accept(10);

      expect(friendshipServiceSpy.acceptRequest).toHaveBeenCalledWith(10, 123);
      expect(component.notifications.length).toBe(0);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'success' }));
    });

    it('should handle accept error', () => {
      friendshipServiceSpy.acceptRequest.and.returnValue(throwError(() => ({ error: { message: 'Err' } })));

      component.accept(10);

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: 'Err' }));
    });
  });

  describe('reject', () => {
    beforeEach(() => {
      spyOn(Swal, 'fire').and.returnValue({ isConfirmed: true } as any);
      component.notifications = [{ id_relacion: 20 }];
    });

    it('should call rejectRequest and reload', () => {
      friendshipServiceSpy.rejectRequest.and.returnValue(of({}));
      friendshipServiceSpy.getNotifications.and.returnValue(of({ pending: [], accepted: [] }));

      component.reject(20);

      expect(friendshipServiceSpy.rejectRequest).toHaveBeenCalledWith(20, 123);
      expect(component.notifications.length).toBe(0);
      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'success' }));
    });

    it('should handle reject error', () => {
      friendshipServiceSpy.rejectRequest.and.returnValue(throwError(() => ({ error: 'Fail' })));

      component.reject(20);

      expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'error', text: '"Fail"' }));
    });
  });
});
