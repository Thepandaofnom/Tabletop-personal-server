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
import { apiBaseUrl } from '../../api';

interface ValidationErrors {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  username: string | null;
  password: string | null;
}

@Component({
  selector: 'new-user-sign-up',
  standalone: true,
  imports: [DialogModule, ButtonModule, InputTextModule, PasswordModule, ToastModule, CommonModule, FormsModule, HttpClientModule],
  providers: [MessageService],
  templateUrl: './new-user-sign-up.html',
  styleUrls: ['./new-user-sign-up.css']
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
  checkingUsername = false;

  errors: ValidationErrors = {
    firstName: null,
    lastName: null,
    email: null,
    username: null,
    password: null
  };

  private readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly PASSWORD_MIN_LENGTH = 8;
  private readonly PASSWORD_SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  private readonly PASSWORD_NUMBER = /[0-9]/;
  private readonly PASSWORD_UPPERCASE = /[A-Z]/;

  private usernameCheckTimeout: any;

  constructor(private messageService: MessageService, private http: HttpClient) {}

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
    if (!v) this.clearForm();
  }

  get isFormValid(): boolean {
    return !this.errors.firstName &&
           !this.errors.lastName &&
           !this.errors.email &&
           !this.errors.username &&
           !this.errors.password &&
           this.firstName.trim() !== '' &&
           this.lastName.trim() !== '' &&
           this.email.trim() !== '' &&
           this.username.trim() !== '' &&
           this.password !== '';
  }

  clearForm() {
    this.firstName = '';
    this.lastName = '';
    this.email = '';
    this.username = '';
    this.password = '';
    this.loading = false;
    this.checkingUsername = false;
    this.errors = {
      firstName: null,
      lastName: null,
      email: null,
      username: null,
      password: null
    };
  }

  onCancel() {
    this.visibleLocal = false;
  }

  onFirstNameChange() {
    this.validateFirstName();
  }

  onLastNameChange() {
    this.validateLastName();
  }

  onEmailChange() {
    this.validateEmail();
  }

  onUsernameChange() {
    this.validateUsername();
  }

  onPasswordChange() {
    this.validatePassword();
  }

  private validateFirstName(): void {
    if (!this.firstName.trim()) {
      this.errors.firstName = 'First name is required';
    } else {
      this.errors.firstName = null;
    }
  }

  private validateLastName(): void {
    if (!this.lastName.trim()) {
      this.errors.lastName = 'Last name is required';
    } else {
      this.errors.lastName = null;
    }
  }

  private validateEmail(): void {
    if (!this.email.trim()) {
      this.errors.email = 'Email is required';
    } else if (!this.EMAIL_REGEX.test(this.email)) {
      this.errors.email = 'Email must be in format: example@domain.com';
    } else {
      this.errors.email = null;
    }
  }

  private validateUsername(): void {
    if (!this.username.trim()) {
      this.errors.username = 'Username is required';
      this.checkingUsername = false;
      return;
    }

    // Basic validation - username must be 3+ characters and alphanumeric
    if (this.username.length < 3) {
      this.errors.username = 'Username must be at least 3 characters';
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(this.username)) {
      this.errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
      return;
    }

    // Clear any pending timeout
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }

    // Debounce the backend check for uniqueness
    this.checkingUsername = true;
    this.usernameCheckTimeout = setTimeout(() => {
      this.http.get<{ exists: boolean }>(`${apiBaseUrl}/api/users/check-username/${encodeURIComponent(this.username)}`)
        .subscribe({
          next: (res) => {
            if (res.exists) {
              this.errors.username = 'Username already exists';
            } else {
              this.errors.username = null;
            }
            this.checkingUsername = false;
          },
          error: (err) => {
            // If the backend check fails, just clear the error (assuming username is available)
            // This allows the form to work even if the uniqueness check isn't deployed yet
            console.warn('Could not verify username uniqueness (backend may not support this yet):', err);
            this.errors.username = null;
            this.checkingUsername = false;
          }
        });
    }, 500);
  }

  private validatePassword(): void {
    const pwd = this.password;

    if (!pwd) {
      this.errors.password = 'Password is required';
    } else if (pwd.length < this.PASSWORD_MIN_LENGTH) {
      this.errors.password = `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters`;
    } else if (!this.PASSWORD_UPPERCASE.test(pwd)) {
      this.errors.password = 'Password must contain at least one uppercase letter';
    } else if (!this.PASSWORD_NUMBER.test(pwd)) {
      this.errors.password = 'Password must contain at least one number';
    } else if (!this.PASSWORD_SPECIAL_CHARS.test(pwd)) {
      this.errors.password = 'Password must contain at least one special character (!@#$%^&*)';
    } else {
      this.errors.password = null;
    }
  }

  get PASSWORD_MIN_LENGTH_CHECK(): boolean {
    return this.password.length >= this.PASSWORD_MIN_LENGTH;
  }

  get PASSWORD_UPPERCASE_CHECK(): boolean {
    return this.PASSWORD_UPPERCASE.test(this.password);
  }

  get PASSWORD_NUMBER_CHECK(): boolean {
    return this.PASSWORD_NUMBER.test(this.password);
  }

  get PASSWORD_SPECIAL_CHECK(): boolean {
    return this.PASSWORD_SPECIAL_CHARS.test(this.password);
  }

  createUser() {
    // Validate all fields synchronously only
    this.validateFirstName();
    this.validateLastName();
    this.validateEmail();
    this.validatePassword();

    // Validate username synchronously (without async backend check)
    if (!this.username.trim()) {
      this.errors.username = 'Username is required';
    } else if (this.username.length < 3) {
      this.errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(this.username)) {
      this.errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    } else {
      this.errors.username = null;
    }

    if (!this.isFormValid) {
      this.messageService.add({ severity: 'error', summary: 'Validation Failed', detail: 'Please fix all errors before creating account' });
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

    this.http.post<any>(`${apiBaseUrl}/api/users`, payload).subscribe({
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
