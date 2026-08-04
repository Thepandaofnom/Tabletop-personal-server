import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'new-user-sign-up',
  standalone: true,
  imports: [DialogModule, ButtonModule, InputTextModule, PasswordModule, ToastModule, CommonModule, FormsModule],
  providers: [MessageService],
  templateUrl: './new-user-sign-up.html',
})
export class NewUserSignUp {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  firstName = '';
  lastName = '';
  email = '';
  username = '';
  password = '';
  loading = false;

  constructor(private messageService: MessageService) {}

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
    if (!v) this.clearForm();
  }

  clearForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.username = '';
    this.password = '';
    this.loading = false;
  }

  onCancel() {
    this.visibleLocal = false;
  }

  createUser() {
    if (!this.username || !this.password) {
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: 'Username and password required' });
      return;
    }
    this.loading = true;
    const payload = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      username: this.username,
      password: this.password
    };

    fetch('http://localhost:8081/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        this.loading = false;
        if (res.ok) {
          this.messageService.add({ severity: 'success', summary: 'User created', detail: 'User created successfully' });
          this.visibleLocal = false;
        } else {
          let txt = await res.text();
          try { txt = JSON.parse(txt).message || txt; } catch { /* ignore */ }
          this.messageService.add({ severity: 'error', summary: 'Error', detail: txt || 'Failed to create user' });
        }
      })
      .catch((err) => {
        this.loading = false;
        console.error('Create user failed', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Network error' });
      });
  }
}
