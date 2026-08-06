import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'global-settings-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './global-settings-component.html',
  styleUrls: ['./global-settings-component.css'],
})
export class GlobalSettingsComponent {
  @Input() darkMode = false;
  @Output() darkModeChange = new EventEmitter<boolean>();

  onDarkModeChange(value: boolean) {
    this.darkMode = value;
    this.darkModeChange.emit(value);
  }
}
