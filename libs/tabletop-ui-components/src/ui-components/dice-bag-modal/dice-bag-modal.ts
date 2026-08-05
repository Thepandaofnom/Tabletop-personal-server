import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'dice-bag-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, CommonModule, FormsModule],
  templateUrl: './dice-bag-modal.html',
})
export class DiceBagModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  result: string = '';
  rollCount = 0;
  resetAfterRoll = true;
  get resultSize(): number {
    return Math.max(7, this.result.length + 2);
  }

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
  }

  rollD4() {
    this.rollDie(4);
  }
  rollD6() {
    this.rollDie(6);
  }
  rollD8() {
    this.rollDie(8);
  }
  rollD10() {
    this.rollDie(10);
  }
  rollD12() {
    this.rollDie(12);
  }
  rollD20() {
    this.rollDie(20);
  }
  rollDPer() {
    this.rollDie(10, true);
  }

  private rollDie(sides: number, percent = false): void {
    const count = Math.min(999, Math.max(0, Math.floor(this.rollCount || 0)));
    const rollTotal = count > 1 ? count : 1;
    const rolls: number[] = [];
    for (let i = 0; i < rollTotal; i++) {
      const rnd = percent ? (Math.floor(Math.random() * 9) + 1) * 10 : Math.floor(Math.random() * sides) + 1;
      rolls.push(rnd);
    }

    if (count <= 1) {
      this.result = String(rolls[0]);
    } else {
      const total = rolls.reduce((sum, roll) => sum + roll, 0);
      this.result = rolls.join(' + ') + ' = ' + total + ' total';
    }

    if (this.resetAfterRoll) {
      this.rollCount = 0;
    }
  }
}
