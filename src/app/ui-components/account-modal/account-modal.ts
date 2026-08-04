import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'account-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, ToastModule, CommonModule],
  providers: [MessageService],
  templateUrl: './account-modal.html',
})
export class AccountModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() logout = new EventEmitter<void>();

  username: string | null = null;
  userId: number | null = null;

  constructor(private messageService: MessageService) {}

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
    if (v) this.loadUserFromToken();
  }

  loadUserFromToken() {
    const token = localStorage.getItem('jwt');
    if (!token) {
      this.username = null;
      this.userId = null;
      return;
    }
    try {
      const parts = token.split('.');
      if (parts.length < 2) throw new Error('bad token');
      const payload = JSON.parse(atob(parts[1]));
      this.username = payload.username || payload.sub || null;
      this.userId = payload.id || null;
    } catch (e) {
      console.error('Failed to parse token', e);
      this.username = null;
      this.userId = null;
    }
  }

  doLogout() {
    localStorage.removeItem('jwt');
    this.messageService.add({ severity: 'success', summary: 'Logged out', detail: 'You have been logged out' });
    this.logout.emit();
    this.visibleLocal = false;
  }
}
