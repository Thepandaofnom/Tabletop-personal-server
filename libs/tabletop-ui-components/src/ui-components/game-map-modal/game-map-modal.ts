import { Component, ElementRef, ViewChild, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import Konva from 'konva';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'game-map-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule, MenuModule, ColorPickerModule, TooltipModule, CommonModule, FormsModule, InputTextModule],
  templateUrl: './game-map-modal.html',
})
export class GameMapModal implements OnDestroy {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @ViewChild('stageContainer', { static: false }) stageContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('menu') menu!: Menu;

  showGrid = false;
  gridColor = '#000000';
  gridCellWidth = 50;
  gridCellHeight = 50;
  zoom = 1;
  scaleGrid = false;
  gridZoom = 1;

  // Token dialog state
  showTokenDialog = false;
  tokenName = '';
  
  // Token edit dialogs
  showRenameDialog = false;
  showColorDialog = false;
  showImageDialog = false;
  showResizeDialog = false;
  showRotateDialog = false;
  editingTokenId?: string;
  newTokenName = '';
  newTokenColor = '#4a90e2';
  tokenResizeValue = 1;
  tokenResizeOldValue = 1;
  tokenRotateValue = 0;
  tokenRotateOldValue = 0;

  menuItems: MenuItem[] = [
    {
      label: 'Show Grid',
      icon: 'pi pi-th',
      command: () => this.toggleGrid(),
    },
    {
      label: 'Add Generic Token',
      icon: 'pi pi-plus',
      command: () => this.openAddTokenDialog(),
    },
    {
      label: 'Export Map Settings',
      icon: 'pi pi-download',
      command: () => this.exportMapSettings(),
    },
    {
      label: 'Import Map Settings',
      icon: 'pi pi-upload',
      command: () => this.importMapSettings(),
    }
  ];

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private gridLayer?: Konva.Layer;
  private tokenLayer?: Konva.Layer;
  private mapImage?: Konva.Image;
  private resizeObserver?: ResizeObserver;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private tokens: Map<string, Konva.Group> = new Map(); // id -> token group
  private tokenColors: Map<string, string> = new Map(); // id -> color
  private tokenImages: Map<string, Konva.Image> = new Map(); // id -> image object
  private tokenScales: Map<string, number> = new Map(); // id -> scale factor
  private tokenRotations: Map<string, number> = new Map(); // id -> rotation in degrees
  private draggingTokenId?: string;
  private hoveredTokenId?: string;

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

        // grid layer (separate so it's always on top)
        this.gridLayer = new Konva.Layer();
        this.stage.add(this.gridLayer);

        // token layer (on top of grid for token interactions)
        this.tokenLayer = new Konva.Layer();
        this.stage.add(this.tokenLayer);

        // Add drag handlers for map panning
        this.stage.on('mousedown', (e) => this.onStageMouseDown(e));
        this.stage.on('mousemove', (e) => this.onStageMouseMove(e));
        this.stage.on('mouseup', () => this.onStageMouseUp());

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

  private onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    // Only drag map if not dragging a token
    if (this.draggingTokenId) {
      return; // Token's mousedown handler already set this
    }

    // Check if clicking on a token by checking if a token is hovered
    if (this.hoveredTokenId) {
      return; // Token mousedown will handle this
    }

    this.isDragging = true;
    this.dragStartX = e.evt.clientX;
    this.dragStartY = e.evt.clientY;
  }

  private onStageMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!this.isDragging || !this.stage || !this.layer || !this.gridLayer) return;

    const deltaX = e.evt.clientX - this.dragStartX;
    const deltaY = e.evt.clientY - this.dragStartY;

    if (this.draggingTokenId) {
      // Move the token independently
      const token = this.tokens.get(this.draggingTokenId);
      if (token) {
        token.x(token.x() + deltaX);
        token.y(token.y() + deltaY);
      }
    } else {
      // Move the map layers and token layer together
      this.layer.x(this.layer.x() + deltaX);
      this.layer.y(this.layer.y() + deltaY);

      this.gridLayer.x(this.gridLayer.x() + deltaX);
      this.gridLayer.y(this.gridLayer.y() + deltaY);

      // Move token layer with the map
      if (this.tokenLayer) {
        this.tokenLayer.x(this.tokenLayer.x() + deltaX);
        this.tokenLayer.y(this.tokenLayer.y() + deltaY);
      }
    }

    // Update drag start position for next move
    this.dragStartX = e.evt.clientX;
    this.dragStartY = e.evt.clientY;

    this.stage.draw();
  }

  private onStageMouseUp() {
    this.isDragging = false;
    this.draggingTokenId = undefined;
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

  toggleGrid() {
    this.showGrid = !this.showGrid;
    if (this.showGrid) {
      this.drawGrid();
    } else {
      this.clearGrid();
    }
  }

  openGridMenu(event: Event) {
    event.stopPropagation();
    if (this.menu) {
      this.menu.toggle(event);
    }
  }

  onGridColorChange(color: string) {
    this.gridColor = color;
    // Redraw grid if it's currently visible
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  onZoomChange(newZoom: number) {
    this.zoom = newZoom / 100; // Convert percentage to decimal
    if (this.stage) {
      // Scale the image layer
      if (this.layer) {
        this.layer.scale({ x: this.zoom, y: this.zoom });
      }
      
      // Scale grid layer only if scaleGrid is true
      if (this.gridLayer) {
        if (this.scaleGrid) {
          this.gridLayer.scale({ x: this.zoom, y: this.zoom });
        } else {
          this.gridLayer.scale({ x: this.gridZoom, y: this.gridZoom });
        }
      }
      
      this.stage.draw();
    }
  }

  onGridZoomChange(newGridZoom: number) {
    this.gridZoom = newGridZoom / 100; // Convert percentage to decimal
    if (this.gridLayer && this.stage) {
      this.gridLayer.scale({ x: this.gridZoom, y: this.gridZoom });
      this.stage.draw();
    }
  }

  private drawGrid() {
    if (!this.gridLayer || !this.stage) return;
    
    this.gridLayer.destroyChildren();
    
    const cellWidth = this.gridCellWidth;
    const cellHeight = this.gridCellHeight;
    const stageW = this.stage.width();
    const stageH = this.stage.height();
    
    // Draw vertical lines
    for (let x = 0; x < stageW; x += cellWidth) {
      const line = new Konva.Line({
        points: [x, 0, x, stageH],
        stroke: this.gridColor,
        strokeWidth: 1,
        opacity: 0.3,
      });
      this.gridLayer.add(line);
    }
    
    // Draw horizontal lines
    for (let y = 0; y < stageH; y += cellHeight) {
      const line = new Konva.Line({
        points: [0, y, stageW, y],
        stroke: this.gridColor,
        strokeWidth: 1,
        opacity: 0.3,
      });
      this.gridLayer.add(line);
    }
    
    this.gridLayer.draw();
  }

  private clearGrid() {
    if (!this.gridLayer) return;
    this.gridLayer.destroyChildren();
    this.gridLayer.draw();
  }

  onGridSizeChange() {
    // Enforce minimum value of 1
    if (this.gridCellWidth < 1) {
      this.gridCellWidth = 1;
    }
    if (this.gridCellHeight < 1) {
      this.gridCellHeight = 1;
    }

    // Redraw grid if it's currently visible
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  openAddTokenDialog() {
    this.tokenName = '';
    this.showTokenDialog = true;
  }

  addToken() {
    if (!this.tokenName.trim() || !this.stage || !this.tokenLayer) return;

    const tokenId = `token-${Date.now()}`;
    
    // Create token group
    const tokenGroup = new Konva.Group({
      x: this.stage.width() / 2,
      y: this.stage.height() / 2,
      name: tokenId,
      draggable: false, // We handle dragging manually
    });

    // Create circle background
    const circle = new Konva.Circle({
      radius: 20,
      fill: '#4a90e2',
      stroke: '#2c5aa0',
      strokeWidth: 2,
    });

    // Create text label
    const text = new Konva.Text({
      text: this.tokenName,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: 40,
      height: 40,
      x: -20,
      y: -20,
    });

    tokenGroup.add(circle);
    tokenGroup.add(text);

    // Add hover effects
    tokenGroup.on('mouseover', () => {
      circle.fill('#5ba3ff');
      this.hoveredTokenId = tokenId;
      document.body.style.cursor = 'grab';
      this.stage?.draw();
    });

    tokenGroup.on('mouseout', () => {
      circle.fill('#4a90e2');
      this.hoveredTokenId = undefined;
      document.body.style.cursor = 'default';
      this.stage?.draw();
    });

    // Add mousedown handler for token dragging
    tokenGroup.on('mousedown', (e) => {
      e.cancelBubble = true; // Prevent event from bubbling to stage
      this.draggingTokenId = tokenId;
      this.isDragging = true;
      this.dragStartX = e.evt.clientX;
      this.dragStartY = e.evt.clientY;
    });

    // Add right-click context menu
    tokenGroup.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.showTokenContextMenu(tokenId, e.evt);
    });

    this.tokenLayer.add(tokenGroup);
    this.tokens.set(tokenId, tokenGroup);
    this.tokenColors.set(tokenId, '#4a90e2'); // Store initial color
    this.tokenLayer.draw();

    this.showTokenDialog = false;
    this.tokenName = '';
  }

  private showTokenContextMenu(tokenId: string, event: MouseEvent) {
    // Create a simple context menu
    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.top = event.clientY + 'px';
    menu.style.left = event.clientX + 'px';
    menu.style.backgroundColor = '#2a2a2a';
    menu.style.border = '1px solid #444';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    menu.style.zIndex = '10000';
    menu.style.minWidth = '150px';

    const createButton = (label: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.display = 'block';
      button.style.width = '100%';
      button.style.padding = '8px 12px';
      button.style.border = 'none';
      button.style.backgroundColor = 'transparent';
      button.style.color = '#fff';
      button.style.cursor = 'pointer';
      button.style.textAlign = 'left';
      button.style.fontSize = '12px';
      button.style.fontFamily = 'Arial';

      button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#404040';
      });

      button.addEventListener('mouseout', () => {
        button.style.backgroundColor = 'transparent';
      });

      button.addEventListener('click', () => {
        onClick();
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      });

      return button;
    };

    menu.appendChild(createButton('Test', () => {
      console.log('helloworld');
    }));

    menu.appendChild(createButton('Rename', () => {
      this.openRenameDialog(tokenId);
    }));

    menu.appendChild(createButton('Change Color', () => {
      this.openColorDialog(tokenId);
    }));

    menu.appendChild(createButton('Add Image', () => {
      this.openImageDialog(tokenId);
    }));

    menu.appendChild(createButton('Resize Token', () => {
      this.openResizeDialog(tokenId);
    }));

    menu.appendChild(createButton('Rotate Token', () => {
      this.openRotateDialog(tokenId);
    }));

    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    const closeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  private openRenameDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    const tokenGroup = this.tokens.get(tokenId);
    if (tokenGroup) {
      const textNode = tokenGroup.findOne('Text') as Konva.Text;
      if (textNode) {
        this.newTokenName = textNode.text();
      }
    }
    this.showRenameDialog = true;
  }

  renameToken() {
    if (!this.newTokenName.trim() || !this.editingTokenId) return;
    
    const tokenGroup = this.tokens.get(this.editingTokenId);
    if (tokenGroup) {
      const textNode = tokenGroup.findOne('Text') as Konva.Text;
      if (textNode) {
        textNode.text(this.newTokenName);
        this.tokenLayer?.draw();
      }
    }
    
    this.showRenameDialog = false;
    this.editingTokenId = undefined;
    this.newTokenName = '';
  }

  private openColorDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    this.newTokenColor = this.tokenColors.get(tokenId) || '#4a90e2';
    this.showColorDialog = true;
  }

  changeTokenColor() {
    if (!this.editingTokenId) return;
    
    const tokenGroup = this.tokens.get(this.editingTokenId);
    if (tokenGroup) {
      const circle = tokenGroup.findOne('Circle') as Konva.Circle;
      if (circle) {
        circle.fill(this.newTokenColor);
        this.tokenColors.set(this.editingTokenId, this.newTokenColor);
        this.tokenLayer?.draw();
      }
    }
    
    this.showColorDialog = false;
    this.editingTokenId = undefined;
  }

  private openImageDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    // Trigger file input click
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e: any) => this.onTokenImageSelected(e, tokenId);
    fileInput.click();
  }

  private onTokenImageSelected(event: Event, tokenId: string) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target?.result) return;

      const img = new Image();
      img.onload = () => {
        const tokenGroup = this.tokens.get(tokenId);
        if (tokenGroup && this.tokenLayer) {
          // Remove existing image if any
          const existingImage = this.tokenImages.get(tokenId);
          if (existingImage) {
            existingImage.destroy();
          }

          // Create Konva image
          const konvaImage = new Konva.Image({
            image: img,
            x: -20,
            y: -20,
            width: 40,
            height: 40,
          });

          // Add to group (image goes behind text)
          tokenGroup.add(konvaImage);
          tokenGroup.moveToBottom();
          
          this.tokenImages.set(tokenId, konvaImage);
          this.tokenLayer.draw();
        }
      };
      img.src = e.target.result as string;
    };

    reader.readAsDataURL(file);
  }

  private openResizeDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    const currentScale = this.tokenScales.get(tokenId) || 1;
    this.tokenResizeOldValue = currentScale;
    this.tokenResizeValue = currentScale;
    this.showResizeDialog = true;
  }

  onTokenResizeChange(newSize: number) {
    if (!this.editingTokenId) return;

    const tokenGroup = this.tokens.get(this.editingTokenId);
    if (tokenGroup) {
     tokenGroup.scale({ x: newSize, y: newSize });
     this.tokenScales.set(this.editingTokenId, newSize);
     this.tokenLayer?.draw();
    }
  }

  confirmTokenResize() {
    // Size is already applied, just close dialog
    this.showResizeDialog = false;
    this.editingTokenId = undefined;
  }

  cancelTokenResize() {
    // Revert to old size
    if (this.editingTokenId) {
     const tokenGroup = this.tokens.get(this.editingTokenId);
     if (tokenGroup) {
       tokenGroup.scale({ x: this.tokenResizeOldValue, y: this.tokenResizeOldValue });
       this.tokenScales.set(this.editingTokenId, this.tokenResizeOldValue);
       this.tokenLayer?.draw();
     }
    }

    this.showResizeDialog = false;
    this.editingTokenId = undefined;
  }

  private openRotateDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    const currentRotation = this.tokenRotations.get(tokenId) || 0;
    this.tokenRotateOldValue = currentRotation;
    this.tokenRotateValue = currentRotation;
    this.showRotateDialog = true;
  }

  onTokenRotateChange(newRotation: number) {
    if (!this.editingTokenId) return;

    const tokenGroup = this.tokens.get(this.editingTokenId);
    if (tokenGroup) {
      tokenGroup.rotation(newRotation);
      this.tokenRotations.set(this.editingTokenId, newRotation);
      this.tokenLayer?.draw();
    }
  }

  confirmTokenRotate() {
    // Rotation is already applied, just close dialog
    this.showRotateDialog = false;
    this.editingTokenId = undefined;
  }

  cancelTokenRotate() {
    // Revert to old rotation
    if (this.editingTokenId) {
      const tokenGroup = this.tokens.get(this.editingTokenId);
      if (tokenGroup) {
        tokenGroup.rotation(this.tokenRotateOldValue);
        this.tokenRotations.set(this.editingTokenId, this.tokenRotateOldValue);
        this.tokenLayer?.draw();
      }
    }

    this.showRotateDialog = false;
    this.editingTokenId = undefined;
  }

  private exportMapSettings() {
    const mapData = {
      gridSettings: {
        showGrid: this.showGrid,
        gridColor: this.gridColor,
        gridCellWidth: this.gridCellWidth,
        gridCellHeight: this.gridCellHeight,
      },
      zoomSettings: {
        zoom: this.zoom,
        scaleGrid: this.scaleGrid,
        gridZoom: this.gridZoom,
      },
      tokens: this.serializeTokens(),
    };

    const dataStr = JSON.stringify(mapData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `map-settings-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private serializeTokens() {
    const tokensList: any[] = [];
    this.tokens.forEach((tokenGroup, tokenId) => {
      const textNode = tokenGroup.findOne('Text') as Konva.Text;
      const tokenName = textNode?.text() || 'Unnamed Token';
      
      const token = {
        id: tokenId,
        name: tokenName,
        x: tokenGroup.x(),
        y: tokenGroup.y(),
        scale: this.tokenScales.get(tokenId) || 1,
        rotation: this.tokenRotations.get(tokenId) || 0,
        color: this.tokenColors.get(tokenId) || '#4a90e2',
        image: this.getTokenImageAsBase64(tokenId),
      };

      tokensList.push(token);
    });

    return tokensList;
  }

  private getTokenImageAsBase64(tokenId: string): string | null {
    const konvaImage = this.tokenImages.get(tokenId);
    if (!konvaImage) return null;

    const image = konvaImage.image() as HTMLImageElement;
    if (!image) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('Failed to serialize image:', e);
    }
    return null;
  }

  private importMapSettings() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.onchange = (e: any) => this.onMapSettingsFileSelected(e);
    fileInput.click();
  }

  private onMapSettingsFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target?.result) return;

      try {
        const mapData = JSON.parse(e.target.result as string);
        this.restoreMapSettings(mapData);
      } catch (error) {
        console.error('Failed to parse map settings file:', error);
        alert('Failed to import map settings. Invalid file format.');
      }
    };

    reader.readAsText(file);
  }

  private restoreMapSettings(mapData: any) {
    if (!this.stage || !this.tokenLayer) return;

    // Restore grid settings
    this.gridColor = mapData.gridSettings?.gridColor || '#000000';
    this.gridCellWidth = mapData.gridSettings?.gridCellWidth || 50;
    this.gridCellHeight = mapData.gridSettings?.gridCellHeight || 50;
    this.showGrid = mapData.gridSettings?.showGrid || false;

    // Restore zoom settings
    this.zoom = mapData.zoomSettings?.zoom || 1;
    this.scaleGrid = mapData.zoomSettings?.scaleGrid || false;
    this.gridZoom = mapData.zoomSettings?.gridZoom || 1;

    // Redraw grid if needed
    if (this.showGrid) {
      this.drawGrid();
    }

    // Clear existing tokens
    this.tokens.forEach((tokenGroup) => {
      tokenGroup.destroy();
    });
    this.tokens.clear();
    this.tokenColors.clear();
    this.tokenImages.clear();
    this.tokenScales.clear();
    this.tokenRotations.clear();

    // Restore tokens
    mapData.tokens?.forEach((tokenData: any) => {
      this.restoreToken(tokenData);
    });

    this.tokenLayer.draw();
  }

  private restoreToken(tokenData: any) {
    if (!this.stage || !this.tokenLayer) return;

    const tokenId = tokenData.id || `token-${Date.now()}`;

    // Create token group
    const tokenGroup = new Konva.Group({
      x: tokenData.x || this.stage.width() / 2,
      y: tokenData.y || this.stage.height() / 2,
      name: tokenId,
      draggable: false,
    });

    // Create circle background
    const circleColor = tokenData.color || '#4a90e2';
    const circle = new Konva.Circle({
      radius: 20,
      fill: circleColor,
      stroke: '#2c5aa0',
      strokeWidth: 2,
    });

    // Create text label
    const text = new Konva.Text({
      text: tokenData.name || 'Token',
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: 40,
      height: 40,
      x: -20,
      y: -20,
    });

    tokenGroup.add(circle);
    tokenGroup.add(text);

    // Add hover effects
    tokenGroup.on('mouseover', () => {
      circle.fill('#5ba3ff');
      document.body.style.cursor = 'grab';
      this.stage?.draw();
    });

    tokenGroup.on('mouseout', () => {
      circle.fill(circleColor);
      document.body.style.cursor = 'default';
      this.stage?.draw();
    });

    // Add mousedown handler for token dragging
    tokenGroup.on('mousedown', (e) => {
      e.cancelBubble = true;
      this.draggingTokenId = tokenId;
      this.isDragging = true;
      this.dragStartX = e.evt.clientX;
      this.dragStartY = e.evt.clientY;
    });

    // Add right-click context menu
    tokenGroup.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.showTokenContextMenu(tokenId, e.evt);
    });

    this.tokenLayer.add(tokenGroup);
    this.tokens.set(tokenId, tokenGroup);
    this.tokenColors.set(tokenId, circleColor);
    this.tokenScales.set(tokenId, tokenData.scale || 1);
    this.tokenRotations.set(tokenId, tokenData.rotation || 0);

    // Apply scale and rotation
    tokenGroup.scale({ x: tokenData.scale || 1, y: tokenData.scale || 1 });
    tokenGroup.rotation(tokenData.rotation || 0);

    // Restore image if present
    if (tokenData.image) {
      this.restoreTokenImage(tokenId, tokenData.image);
    }
  }

  private restoreTokenImage(tokenId: string, base64Image: string) {
    const tokenGroup = this.tokens.get(tokenId);
    if (!tokenGroup || !this.tokenLayer) return;

    const img = new Image();
    img.onload = () => {
      const konvaImage = new Konva.Image({
        image: img,
        x: -20,
        y: -20,
        width: 40,
        height: 40,
      });

      tokenGroup.add(konvaImage);
      tokenGroup.moveToBottom();
      this.tokenImages.set(tokenId, konvaImage);
      this.tokenLayer?.draw();
    };
    img.onerror = () => {
      console.warn('Failed to restore token image');
    };
    img.src = base64Image;
  }

  private destroyStage() {
    try {
      window.removeEventListener('resize', this.onWindowResize);
      this.resizeObserver?.disconnect();
      this.clearGrid();
      this.gridLayer?.destroy();
      this.tokenLayer?.destroy();
      this.stage?.destroy();
      this.stage = undefined;
      this.layer = undefined;
      this.gridLayer = undefined;
      this.tokenLayer = undefined;
      this.mapImage = undefined;
      this.tokens.clear();
      this.tokenColors.clear();
      this.tokenImages.clear();
      this.tokenScales.clear();
      this.tokenRotations.clear();
    } catch (e) {
      console.error('Failed to destroy Konva stage', e);
    }
  }

  ngOnDestroy() {
    this.destroyStage();
  }
}

