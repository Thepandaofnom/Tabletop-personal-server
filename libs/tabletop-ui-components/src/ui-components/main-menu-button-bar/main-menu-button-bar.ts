import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { LoginModal, LoginResponse } from '../login-modal/login-modal';

@Component({
  selector: 'main-menu-button-bar',
  standalone: true,
  imports: [CommonModule, ButtonModule, LoginModal],
  templateUrl: './main-menu-button-bar.html',
  styleUrls: ['./main-menu-button-bar.css']
})
export class MainMenuButtonBar {
  @Input() loggedIn = false;
  @Input() loginVisible = false;
  
  @Output() loginVisibleChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<LoginResponse>();
  @Output() openGameMap = new EventEmitter<void>();
  @Output() openDiceBag = new EventEmitter<void>();
  @Output() openCharacterSheets = new EventEmitter<void>();
  @Output() openOptions = new EventEmitter<void>();
  @Output() openNPCMaker = new EventEmitter<void>();
  @Output() onLoginClick = new EventEmitter<void>();
  @Output() onSignupClick = new EventEmitter<void>();
  @Output() onAccountClick = new EventEmitter<void>();
  @Output() onLogoutClick = new EventEmitter<void>();

  menuOpen = false;

  onMenuCharacterSheetsClick() {
    this.openCharacterSheets.emit();
  }

  onMenuLoginClick() {
    this.onLoginClick.emit();
  }

  onMenuSignupClick() {
    this.onSignupClick.emit();
  }

  onMenuAccountClick() {
    this.onAccountClick.emit();
  }

  onMenuLogoutClick() {
    this.onLogoutClick.emit();
  }

  onGameMapClick() {
    this.openGameMap.emit();
  }

  onDiceBagClick() {
    this.openDiceBag.emit();
  }

  onLoginModalSuccess(event: LoginResponse) {
    this.loginSuccess.emit(event);
  }

  onNPCMakerClick() {
    this.openNPCMaker.emit();
  }

  onOptionsClick() {
    this.openOptions.emit();
  }

  get loginVisibleLocal() {
    return this.loginVisible;
  }
  set loginVisibleLocal(v: boolean) {
    this.loginVisible = v;
    this.loginVisibleChange.emit(v);
  }
}
