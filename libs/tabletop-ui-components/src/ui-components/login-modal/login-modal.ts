import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { apiBaseUrl } from '../../api';

export interface LoginResponse {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Component({
  selector: 'login-modal',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [MessageService],
  templateUrl: './login-modal.html'
})
export class LoginModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<LoginResponse>();

  username = '';
  password = '';
  loading = false;

  constructor(
    private messageService: MessageService,
    private http: HttpClient
  ) {}

  get visibleLocal() {
    return this.visible;
  }

  set visibleLocal(value: boolean) {
    this.visible = value;
    this.visibleChange.emit(value);
    if (!value) {
      this.clearForm();
    }
  }

  clearForm() {
    this.username = '';
    this.password = '';
    this.loading = false;
  }

  onCancel() {
    this.visibleLocal = false;
  }

  doLogin() {
    if (!this.username || !this.password) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation',
        detail: 'Username and password required'
      });
      return;
    }

    this.loading = true;
    const payload = { username: this.username, password: this.password };
    this.http.post<LoginResponse>(`${apiBaseUrl}/api/auth/login`, payload, { withCredentials: true }).subscribe({
      next: (response) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'Login', detail: 'Login successful' });
        this.loginSuccess.emit(response);
        this.visibleLocal = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        const detail = error.error?.message ?? error.error?.error ?? error.statusText ?? 'Invalid credentials';
        this.messageService.add({ severity: 'error', summary: 'Login failed', detail });
      }
    });
  }
}
