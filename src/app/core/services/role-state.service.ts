import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppRole = 'passenger' | 'driver' | null;

@Injectable({ providedIn: 'root' })
export class RoleStateService {
  private readonly storageKey = 'uride_current_role';
  
  private readonly roleSubj = new BehaviorSubject<AppRole>(this.getInitialRole());
  readonly role$ = this.roleSubj.asObservable();

  get currentRole(): AppRole {
    return this.roleSubj.value;
  }

  setRole(role: AppRole): void {
    if (role) {
      localStorage.setItem(this.storageKey, role);
    } else {
      localStorage.removeItem(this.storageKey);
    }
    this.roleSubj.next(role);
  }

  private getInitialRole(): AppRole {
    const saved = localStorage.getItem(this.storageKey);
    return (saved === 'passenger' || saved === 'driver') ? saved : null;
  }
}
