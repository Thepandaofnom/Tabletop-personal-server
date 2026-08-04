import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { DiceBagModal, GameMapModal, NewUserSignUp, MainMenuButtonBar } from '@tabletop/ui-components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HttpClientModule, DiceBagModal, GameMapModal, NewUserSignUp, MainMenuButtonBar],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;
  protected gameMapVisible = false;
  protected loginVisible = false;
  protected loggedIn = false;
  protected signupVisible = false;

  constructor(private http: HttpClient) {}

  onLoginSuccess(event: { username: string; token: string }) {
    this.loggedIn = true;
    console.log('Logged in as', event.username);
  }

  doLogout() {
    const token = (() => { try { return localStorage.getItem('jwt'); } catch { return null; } })();
    if (token) {
      this.http.post<any>('https://tabletop-personal-server-production.up.railway.app/api/auth/logout', {}).subscribe({
        next: () => {
          try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
          this.loggedIn = false;
          console.log('Logged out (server notified)');
        },
        error: (err) => {
          console.warn('Logout request failed', err);
          try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
          this.loggedIn = false;
        }
      });
    } else {
      try { localStorage.removeItem('jwt'); } catch (e) { console.warn('Failed to remove jwt', e); }
      this.loggedIn = false;
      console.log('Logged out (no token)');
    }
  }

  onMenuLogin() {
    this.loginVisible = true;
  }

  onMenuSignup() {
    this.signupVisible = true;
  }

  onMenuLogout() {
    this.doLogout();
  }

  onMenuGameMapClick() {
    this.gameMapVisible = true;
  }

  onMenuDiceBagClick() {
    this.diceBagVisible = true;
  }
}
