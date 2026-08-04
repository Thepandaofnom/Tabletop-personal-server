import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { AuthInterceptor } from './auth.interceptor';
import { DiceBagModal } from './ui-components/dice-bag-modal/dice-bag-modal';
import { GameMapModal } from './ui-components/game-map-modal/game-map-modal';
import { NewUserSignUp } from './ui-components/new-user-sign-up/new-user-sign-up';
import { LoginModal } from './ui-components/login-modal/login-modal';
import { AccountModal } from './ui-components/account-modal/account-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HttpClientModule, ButtonModule, DiceBagModal, GameMapModal, NewUserSignUp, LoginModal, AccountModal],
    providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
    templateUrl: './app.html',
    styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;
  protected gameMapVisible = false;
  protected loginVisible = false;

  constructor(private http: HttpClient) {}

  // UI state for hamburger menu
  protected menuOpen = false;
  protected loggedIn = false; // toggled on successful login
  protected signupVisible = false;

  openDiceBag() { this.diceBagVisible = true; }
  openGameMap() { this.gameMapVisible = true; }

  // Hamburger menu actions
  onLogin() {
    this.menuOpen = false;
    this.loginVisible = true;
  }
  onSignup() {
    this.menuOpen = false;
    this.signupVisible = true;
  }
  accountVisible = false;

  onAccount() {
    this.menuOpen = false;
    this.accountVisible = true;
  }

  onLoginSuccess(event: { username: string; token: string }) {
    this.loggedIn = true;
    console.log('Logged in as', event.username);
  }

  doLogout() {
    // call backend to revoke token (best-effort), then clear JWT
    const token = (() => { try { return localStorage.getItem('jwt'); } catch { return null; } })();
    if (token) {
      this.http.post<any>('http://localhost:8081/api/auth/logout', {}).subscribe({
        next: () => {
          try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
          this.loggedIn = false;
          this.menuOpen = false;
          console.log('Logged out (server notified)');
        },
        error: (err) => {
          console.warn('Logout request failed', err);
          // still clear locally
          try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
          this.loggedIn = false;
          this.menuOpen = false;
        }
      });
    } else {
      try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
      this.loggedIn = false;
      this.menuOpen = false;
      console.log('Logged out (no token)');
    }
  }

  onLogout() {
    // called from account-modal logout event
    this.doLogout();
  }
}
