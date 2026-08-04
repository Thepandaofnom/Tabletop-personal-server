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

      const attemptInit = (attempt = 1) => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        console.log('initStage attempt', attempt, 'container size', w, h);
        if (h === 0 && attempt <= 10) {
          // not laid out yet — retry after a short delay
          setTimeout(() => attemptInit(attempt + 1), 50);
          return;
        }
        // fallback if still zero
        const finalW = w || Math.floor(window.innerWidth * 0.8);
        const finalH = h || Math.floor(window.innerHeight * 0.8) - 48; // approximate header height

        if (h === 0) {
          console.warn('Container height is 0 after retries — setting explicit height fallback', finalH);
          container.style.height = `${finalH}px`;
        }
        if (w === 0) {
          container.style.width = `${finalW}px`;
        }

        this.stage = new Konva.Stage({
          container: container,
          width: finalW,
          height: finalH,
        });
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // observe container resize for dynamic resizing
        this.resizeObserver = new ResizeObserver(() => this.onContainerResize());
        this.resizeObserver.observe(container);

        window.addEventListener('resize', this.onWindowResize);
      };

      attemptInit();
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

  onDialogShown() {
    // Dialog content is attached to the DOM — initialize stage afterwards
    setTimeout(() => this.initStage(), 0);
  }

  onFileChange(evt: Event) {
    console.log('onFileChange called');
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.log('No files in input');
      return;
    }
    const file = input.files[0];
    console.log('Selected file:', file.name, file.type, file.size);
    if (!this.stage || !this.layer) {
      console.log('Stage not ready; initializing and deferring file load');
      this.initStage();
      setTimeout(() => this.loadFile(file), 150);
      return;
    }
    this.loadFile(file);
  }

  private loadFile(file: File) {
    console.log('loadFile starting for', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      console.log('FileReader.onload, src length:', src?.length ?? 0);
      const img = new window.Image();
      img.onload = () => {
        console.log('Image loaded, dimensions:', img.width, img.height);
        if (!this.stage || !this.layer) {
          console.warn('Stage not initialized in img.onload; attempting re-init');
          this.initStage();
          setTimeout(() => this.addImageToLayer(img), 100);
          return;
        }
        this.addImageToLayer(img);
      };
      img.onerror = (err) => {
        console.error('Image failed to load', err);
      };
      img.src = src;
    };
    reader.onerror = (err) => console.error('FileReader error', err);
    reader.readAsDataURL(file);
  }

  private addImageToLayer(img: HTMLImageElement) {
    console.log('addImageToLayer called');
    if (!this.stage || !this.layer) {
      console.error('Cannot add image: stage or layer missing');
      return;
    }
    console.log('Stage size:', this.stage.width(), this.stage.height());
    if (this.mapImage) {
      console.log('Removing previous map image');
      this.mapImage.destroy();
      this.mapImage = undefined;
    }
    const konvaImg = new Konva.Image({ image: img, x: 0, y: 0 });
    const stageW = this.stage.width();
    const stageH = this.stage.height();
    const scale = Math.min(stageW / img.width, stageH / img.height, 1);
    console.log('Scaling image by', scale);
    konvaImg.scale({ x: scale, y: scale });
    this.layer.add(konvaImg);
    this.layer.draw();
    this.mapImage = konvaImg;
    console.log('Image added to layer');
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
