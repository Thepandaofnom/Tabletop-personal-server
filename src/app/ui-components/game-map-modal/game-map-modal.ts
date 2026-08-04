import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import Konva from 'konva';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'game-map-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, CommonModule],
  templateUrl: './game-map-modal.html',
})
export class GameMapModal implements OnDestroy {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('stageContainer', { static: false }) stageContainer!: ElementRef<HTMLDivElement>;

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private mapImage?: Konva.Image;
  private resizeObserver?: ResizeObserver;

  get visibleLocal() {
    return this.visible;
  }
  set visibleLocal(v: boolean) {
    this.visible = v;
    this.visibleChange.emit(v);
    if (v) {
      // initialize stage after the dialog is visible
      setTimeout(() => this.initStage(), 0);
    } else {
      this.destroyStage();
    }
  }

  private initStage() {
    try {
      if (!this.stageContainer) return;
      const container = this.stageContainer.nativeElement;
      // prevent double init
      if (this.stage) return;
      this.stage = new Konva.Stage({
        container: container,
        width: container.clientWidth,
        height: container.clientHeight,
      });
      this.layer = new Konva.Layer();
      this.stage.add(this.layer);

      // observe container resize for dynamic resizing
      this.resizeObserver = new ResizeObserver(() => this.onContainerResize());
      this.resizeObserver.observe(container);

      window.addEventListener('resize', this.onWindowResize);
    } catch (e) {
      console.error('Failed to initialize Konva stage', e);
    }
  }

  private onContainerResize() {
    if (!this.stage || !this.stageContainer) return;
    const c = this.stageContainer.nativeElement;
    this.stage.width(c.clientWidth);
    this.stage.height(c.clientHeight);
    this.stage.draw();
  }

  private onWindowResize = () => {
    if (!this.stage || !this.stageContainer) return;
    const c = this.stageContainer.nativeElement;
    this.stage.width(c.clientWidth);
    this.stage.height(c.clientHeight);
    this.stage.draw();
  };

  onDialogResize(event: any) {
    // dialog resize may happen before DOM updates, run after a short timeout
    setTimeout(() => this.onContainerResize(), 50);
  }

  onFileChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        if (!this.stage || !this.layer) return;
        // remove previous image
        if (this.mapImage) {
          this.mapImage.destroy();
          this.mapImage = undefined;
        }
        const konvaImg = new Konva.Image({ image: img, x: 0, y: 0 });
        // scale image to fit stage while preserving aspect
        const stageW = this.stage.width();
        const stageH = this.stage.height();
        const scale = Math.min(stageW / img.width, stageH / img.height, 1);
        konvaImg.scale({ x: scale, y: scale });
        this.layer.add(konvaImg);
        this.layer.draw();
        this.mapImage = konvaImg;
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  clearMap() {
    if (this.mapImage) {
      this.mapImage.destroy();
      this.mapImage = undefined;
    }
    this.layer?.draw();
  }

  private destroyStage() {
    try {
      window.removeEventListener('resize', this.onWindowResize);
      this.resizeObserver?.disconnect();
      this.stage?.destroy();
      this.stage = undefined;
      this.layer = undefined;
      this.mapImage = undefined;
    } catch (e) {
      console.error('Failed to destroy Konva stage', e);
    }
  }

  ngOnDestroy() {
    this.destroyStage();
  }
}
