import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'main-menu-button-bar',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './main-menu-button-bar.html',
  styleUrls: ['./main-menu-button-bar.css']
})
export class MainMenuButtonBar {
  @Output() openGameMap = new EventEmitter<void>();
  @Output() openDiceBag = new EventEmitter<void>();
  @Output() openCharacterSheets = new EventEmitter<void>();
  @Output() openOptions = new EventEmitter<void>();
  @Output() openNPCMaker = new EventEmitter<void>();

  menuOpen = false;

  onMenuCharacterSheetsClick() {
    this.openCharacterSheets.emit();
  }

  onGameMapClick() {
    this.openGameMap.emit();
  }

  onDiceBagClick() {
    this.openDiceBag.emit();
  }

  onNPCMakerClick() {
    this.openNPCMaker.emit();
  }

  onOptionsClick() {
    this.openOptions.emit();
  }

}
