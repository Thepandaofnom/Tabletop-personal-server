import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'account-view-panel',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './account-view-panel.html',
  styleUrls: ['./account-view-panel.css']
})
export class AccountViewPanel implements OnChanges {
  @Input() username = '';
  @Input() firstName = '';
  @Input() lastName = '';
  @Input() email = '';

  @Output() closePanel = new EventEmitter<void>();

  ngOnChanges(_: SimpleChanges): void {
    return;
  }

  onClose() {
    this.closePanel.emit();
  }
}
