import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DiceBagModal } from './ui-components/dice-bag-modal/dice-bag-modal';
import { GameMapModal } from './ui-components/game-map-modal/game-map-modal';
import { NewUserSignUp } from './ui-components/new-user-sign-up/new-user-sign-up';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ButtonModule, DiceBagModal, GameMapModal, NewUserSignUp],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Tabletop Personal Server');
  protected diceBagVisible = false;
  protected gameMapVisible = false;

  // UI state for hamburger menu
  protected menuOpen = false;
  protected loggedIn = false; // toggle this to simulate authenticated state
  protected signupVisible = false;

  openDiceBag() { this.diceBagVisible = true; }
  openGameMap() { this.gameMapVisible = true; }

  // Hamburger menu actions
  onLogin() {
    console.log('Login clicked');
    this.menuOpen = false;
    // TODO: open login dialog / navigate
  }
  onSignup() {
    console.log('Sign up clicked');
    this.menuOpen = false;
    this.signupVisible = true;
  }
  onAccount() {
    console.log('Account clicked');
    this.menuOpen = false;
    // TODO: open account/settings
  }
}
