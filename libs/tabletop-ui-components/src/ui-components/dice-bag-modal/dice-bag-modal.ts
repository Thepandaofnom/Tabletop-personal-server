import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dice-bag-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, CommonModule],
  templateUrl: './dice-bag-modal.html',
})
export class DiceBagModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  result: string = '';

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
  }

  rollD4() {
    const rnd = Math.floor(Math.random() * 4) + 1;
    this.result = String(rnd);
  }
  rollD6() {
    const rnd = Math.floor(Math.random() * 6) + 1;
    this.result = String(rnd);
  }
  rollD8() {
    const rnd = Math.floor(Math.random() * 8) + 1;
    this.result = String(rnd);
  }
  rollD10() {
    const rnd = Math.floor(Math.random() * 10) + 1;
    this.result = String(rnd);
  }
  rollD12() {
    const rnd = Math.floor(Math.random() * 12) + 1;
    this.result = String(rnd);
  }
  rollD20() {
    const rnd = Math.floor(Math.random() * 20) + 1;
    this.result = String(rnd);
  }
  rollDPer() {
    const rnd = (Math.floor(Math.random() * 9) + 1)*10;
    this.result = String(rnd);
  }
}
