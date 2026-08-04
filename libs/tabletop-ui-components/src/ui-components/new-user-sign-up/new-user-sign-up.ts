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
  selector: 'new-user-sign-up',
  standalone: true,
  imports: [DialogModule, ButtonModule, InputTextModule, PasswordModule, ToastModule, CommonModule, FormsModule, HttpClientModule],
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

    this.http.post<any>('https://tabletop-personal-server-production.up.railway.app/api/users', payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.messageService.add({ severity: 'success', summary: 'User created', detail: 'User created successfully' });
        this.visibleLocal = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        let detail = 'Failed to create user';
        if (err.error) {
          try { detail = err.error.message || err.error.error || JSON.stringify(err.error); } catch { detail = String(err.error); }
        } else {
          detail = err.statusText || detail;
        }
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      }
    });
  }
}
