import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'login-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, InputTextModule, PasswordModule, ToastModule, CommonModule, FormsModule, HttpClientModule],
  providers: [MessageService],
  templateUrl: './login-modal.html',
})
export class LoginModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<{ username: string; token: string }>();

  username = '';
  password = '';
  loading = false;

  constructor(private messageService: MessageService, private http: HttpClient) {}

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
    if (!v) this.clearForm();
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
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: 'Username and password required' });
      return;
    }
    this.loading = true;
    const payload = { username: this.username, password: this.password };
    this.http.post<any>('http://localhost:8081/api/auth/login', payload).subscribe({
      next: (res) => {
        this.loading = false;
        // Check if response contains an error
        if (res?.error) {
          this.messageService.add({ severity: 'error', summary: 'Login failed', detail: res.error });
          return;
        }
        const token = res?.token;
        if (token) {
          localStorage.setItem('jwt', token);
          this.messageService.add({ severity: 'success', summary: 'Login', detail: 'Login successful' });
          this.loginSuccess.emit({ username: this.username, token });
          this.visibleLocal = false;
        } else {
          this.messageService.add({ severity: 'error', summary: 'Login', detail: 'No token received' });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        let detail = 'Invalid credentials';
        if (err.error) {
          try { detail = err.error.error || err.error.message || JSON.stringify(err.error); } catch { detail = String(err.error); }
        } else {
          detail = err.statusText || detail;
        }
        this.messageService.add({ severity: 'error', summary: 'Login failed', detail });
      }
    });
  }
}
