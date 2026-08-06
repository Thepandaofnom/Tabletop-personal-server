import { Component, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
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

interface SavedMapTokenState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  image?: string | null;
}

interface SavedMapScene {
  gridSettings: {
    showGrid: boolean;
    gridColor: string;
    gridCellWidth: number;
    gridCellHeight: number;
  };
  zoomSettings: {
    zoom: number;
    scaleGrid: boolean;
    gridZoom: number;
  };
  viewport: {
    offsetX: number;
    offsetY: number;
  };
  mapImage: string | null;
  tokens: SavedMapTokenState[];
}

@Component({
  selector: 'game-map-component',
  standalone: true,
  imports: [DialogModule, ButtonModule, MenuModule, ColorPickerModule, TooltipModule, CommonModule, FormsModule, InputTextModule],
  templateUrl: './game-map-component.html',
  styleUrls: ['./game-map-component.css'],
})
export class GameMapComponent implements OnDestroy, AfterViewInit {
  @ViewChild('stageContainer', { static: false }) stageContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('konvaContainer', { static: false }) konvaContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('menu') menu!: Menu;

  showGrid = false;
  gridColor = '#000000';
  gridCellWidth = 50;
  gridCellHeight = 50;
  zoom = 1;
  scaleGrid = false;
  gridZoom = 1;
  showFullscreenControl = false;
  isFullscreen = false;

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
    },
  ];

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private gridLayer?: Konva.Layer;
  private tokenLayer?: Konva.Layer;
  private mapImage?: Konva.Image;
  private resizeObserver?: ResizeObserver;
  private stageInitializationTimeout?: ReturnType<typeof setTimeout>;
  private fullscreenControlTimeout?: ReturnType<typeof setTimeout>;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private tokens: Map<string, Konva.Group> = new Map(); // id -> token group
  private tokenColors: Map<string, string> = new Map(); // id -> color
  private tokenImages: Map<string, Konva.Image> = new Map(); // id -> image object
  private tokenBasePositions: Map<string, { x: number; y: number }> = new Map(); // id -> base position at 100% zoom
  private tokenBaseSizes: Map<string, number> = new Map(); // id -> base size at 100% zoom
  private tokenUserScales: Map<string, number> = new Map(); // id -> user resize scale multiplier
  private tokenRotations: Map<string, number> = new Map(); // id -> rotation in degrees
  private tokenImageSources: Map<string, string> = new Map();
  private draggingTokenId?: string;
  private hoveredTokenId?: string;
  private selectedTokenIds: Set<string> = new Set();
  private selectionRect?: Konva.Rect;
  private selectionStart?: { x: number; y: number };
  private ctrlSelectActive = false;

  private exportMapSettingsData(): string {
    return JSON.stringify(this.buildSavedMapScene(), null, 2);
  }

  private buildSavedMapScene(): SavedMapScene {
    const scene: SavedMapScene = {
      gridSettings: {
        showGrid: this.showGrid,
        gridColor: this.gridColor,
        gridCellWidth: this.gridCellWidth,
        gridCellHeight: this.gridCellHeight
      },
      zoomSettings: {
        zoom: this.zoom,
        scaleGrid: this.scaleGrid,
        gridZoom: this.gridZoom
      },
      viewport: {
        offsetX: this.layer?.x() || 0,
        offsetY: this.layer?.y() || 0
      },
      mapImage: this.getMapImageAsBase64(),
      tokens: []
    };
    this.tokens.forEach((tokenGroup, tokenId) => {
      const textNode = tokenGroup.findOne('Text') as Konva.Text | null;
      const image = this.getTokenImageAsBase64(tokenId);
      scene.tokens.push({
        id: tokenId,
        name: textNode ? textNode.text() : tokenId,
        color: this.tokenColors.get(tokenId) || '#4a90e2',
        x: tokenGroup.x(),
        y: tokenGroup.y(),
        scale: this.tokenUserScales.get(tokenId) || 1,
        rotation: this.tokenRotations.get(tokenId) || 0,
        image
      });
    });
    return scene;
  }

  private applyMapSettings(json: string): void {
    const parsed = JSON.parse(json) as SavedMapScene;
    this.showGrid = !!parsed.gridSettings?.showGrid;
    this.gridColor = parsed.gridSettings?.gridColor || this.gridColor;
    this.gridCellWidth = Number(parsed.gridSettings?.gridCellWidth) || this.gridCellWidth;
    this.gridCellHeight = Number(parsed.gridSettings?.gridCellHeight) || this.gridCellHeight;
    this.zoom = Number(parsed.zoomSettings?.zoom) || this.zoom;
    this.scaleGrid = !!parsed.zoomSettings?.scaleGrid;
    this.gridZoom = Number(parsed.zoomSettings?.gridZoom) || this.gridZoom;

    this.resetSceneLayers();
    if (this.stage && this.layer && parsed.mapImage) {
      const img = new Image();
      img.onload = () => {
        const konvaImg = new Konva.Image({
          image: img,
          x: parsed.viewport?.offsetX ?? 0,
          y: parsed.viewport?.offsetY ?? 0
        });
        this.layer?.add(konvaImg);
        this.mapImage = konvaImg;
        this.layer?.draw();
        (parsed.tokens || []).forEach(savedToken => this.restoreSavedToken(savedToken));
        this.onZoomChange(this.zoom * 100);
        if (this.showGrid) {
          this.drawGrid();
        } else {
          this.clearGrid();
        }
        this.stage?.draw();
      };
      img.src = parsed.mapImage;
      return;
    }

    (parsed.tokens || []).forEach(savedToken => this.restoreSavedToken(savedToken));
    this.onZoomChange(this.zoom * 100);
    if (this.showGrid) {
      this.drawGrid();
    } else {
      this.clearGrid();
    }
    this.stage?.draw();
  }

  private resetSceneLayers(): void {
    if (this.mapImage) {
      this.mapImage.destroy();
      this.mapImage = undefined;
    }
    this.tokens.forEach(token => token.destroy());
    this.tokens.clear();
    this.tokenColors.clear();
    this.tokenImages.forEach(image => image.destroy());
    this.tokenImages.clear();
    this.tokenBasePositions.clear();
    this.tokenBaseSizes.clear();
    this.tokenUserScales.clear();
    this.tokenRotations.clear();
    this.tokenImageSources.clear();
    this.selectedTokenIds.clear();
    this.selectionRect?.destroy();
    this.selectionRect = undefined;
    this.selectionStart = undefined;
    this.tokenLayer?.draw();
    this.layer?.draw();
  }

  private initStage() {
    try {
      if (!this.stageContainer || !this.konvaContainer) return;
      const container = this.konvaContainer.nativeElement;
      // prevent double init
      if (this.stage) return;

      const attemptInit = (attempt = 1) => {
        const dimensions = this.getStageDimensions();
        if (!dimensions) {
          return;
        }

        const { width, height } = dimensions;
        console.log('initStage attempt', attempt, 'container size', width, height);
        if ((width === 0 || height === 0) && attempt <= 10) {
          // not laid out yet — retry after a short delay
          this.stageInitializationTimeout = setTimeout(() => {
            this.stageInitializationTimeout = undefined;
            attemptInit(attempt + 1);
          }, 50);
          return;
        }

        if (this.isFullscreen && (width === 0 || height === 0)) {
          console.warn('Fullscreen map container has no size after initialization retries');
          return;
        }

        // Create the stage with a fallback drawing buffer while the host awaits its first layout.
        // Do not set fallback dimensions on the host: they would override fullscreen CSS sizing.
        const finalW = width || Math.floor(window.innerWidth * 0.8);
        const finalH = height || Math.floor(window.innerHeight * 0.8) - 48;

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

        // Add wheel zoom handler
        container.addEventListener('wheel', (e) => this.onStageWheel(e));

        // The stage host is the fullscreen element, so its box is the Konva viewport.
        this.resizeObserver = new ResizeObserver(() => this.onContainerResize());
        this.resizeObserver.observe(this.stageContainer.nativeElement);
      };

      attemptInit();
    } catch (e) {
      console.error('Failed to initialize Konva stage', e);
    }
  }

  private getStageDimensions(): { width: number; height: number } | undefined {
    if (!this.stageContainer) {
      return undefined;
    }

    const container = this.stageContainer.nativeElement;
    return {
      width: container.clientWidth,
      height: container.clientHeight,
    };
  }

  private onContainerResize() {
    if (!this.stage) return;

    const dimensions = this.getStageDimensions();
    if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
      return;
    }

    this.stage.width(dimensions.width);
    this.stage.height(dimensions.height);
    if (this.showGrid) {
      this.drawGrid();
    }
    this.stage.draw();
  }

  private onWindowResize = () => {
    this.onContainerResize();
  };

  ngAfterViewInit() {
    // Component content is attached to the DOM — initialize stage
    this.stageInitializationTimeout = setTimeout(() => {
      this.stageInitializationTimeout = undefined;
      this.initStage();
    }, 0);

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('mousemove', this.onDocumentMouseMove);
    document.addEventListener('mouseup', this.onDocumentMouseUp);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
  }

  onMapPointerMove(): void {
    this.showFullscreenControl = true;
    this.scheduleFullscreenControlHide();
  }

  onMapPointerLeave(): void {
    this.clearFullscreenControlHideTimeout();
    this.showFullscreenControl = false;
  }

  toggleFullscreen(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.stageContainer) {
      return;
    }

    if (document.fullscreenElement === this.stageContainer.nativeElement) {
      void document.exitFullscreen().catch((error: unknown) => {
        console.error('Failed to exit fullscreen map view', error);
      });
      return;
    }

    void this.stageContainer.nativeElement.requestFullscreen().catch((error: unknown) => {
      console.error('Failed to enter fullscreen map view', error);
    });
  }

  private scheduleFullscreenControlHide(): void {
    this.clearFullscreenControlHideTimeout();
    this.fullscreenControlTimeout = setTimeout(() => {
      this.showFullscreenControl = false;
    }, 3000);
  }

  private clearFullscreenControlHideTimeout(): void {
    if (this.fullscreenControlTimeout !== undefined) {
      clearTimeout(this.fullscreenControlTimeout);
      this.fullscreenControlTimeout = undefined;
    }
  }

  private onFullscreenChange = (): void => {
    this.isFullscreen = document.fullscreenElement === this.stageContainer?.nativeElement;
    requestAnimationFrame(() => this.onContainerResize());
  };

  private onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.ctrlKey && e.evt.button === 0) {
      e.evt.preventDefault();
      this.startSelection(e.evt);
      return;
    }

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
    if (this.selectionRect && this.selectionStart && this.stage) {
      this.updateSelection(e.evt);
      return;
    }

    if (!this.isDragging || !this.stage || !this.layer || !this.gridLayer) return;

    const deltaX = e.evt.clientX - this.dragStartX;
    const deltaY = e.evt.clientY - this.dragStartY;

    if (this.draggingTokenId) {
      if (this.selectedTokenIds.size > 1 && this.selectedTokenIds.has(this.draggingTokenId)) {
        this.moveSelectedTokens(deltaX, deltaY);
      } else {
        // Move the token independently
        const token = this.tokens.get(this.draggingTokenId);
        if (token) {
          const newX = token.x() + deltaX;
          const newY = token.y() + deltaY;
          token.x(newX);
          token.y(newY);
          
          // Update base position (divide by zoom to store unzoomed position)
          this.tokenBasePositions.set(this.draggingTokenId, {
            x: newX / this.zoom,
            y: newY / this.zoom
          });
        }
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

      if (this.showGrid) {
        this.drawGrid();
      }
    }

    // Update drag start position for next move
    this.dragStartX = e.evt.clientX;
    this.dragStartY = e.evt.clientY;

    this.stage.draw();
  }

  private onStageMouseUp() {
    if (this.selectionRect) {
      this.finishSelection();
      return;
    }
    this.isDragging = false;
    this.draggingTokenId = undefined;
  }

  private onDocumentMouseMove = (event: MouseEvent) => {
    if (!this.ctrlSelectActive || !this.selectionRect || !this.selectionStart || !this.stage) return;
    this.updateSelection(event);
  };

  private onDocumentMouseUp = () => {
    if (this.selectionRect) {
      this.finishSelection();
    }
  };

  private onStageWheel(e: WheelEvent) {
    if (!this.stage) return;

    e.preventDefault();

    // Get the current zoom level (convert from percentage to decimal if needed)
    let newZoom = this.zoom;

    // Adjust zoom based on scroll direction
    // Negative deltaY means scroll up (zoom in), positive means scroll down (zoom out)
    const zoomSpeed = 0.1; // 10% per scroll tick
    if (e.deltaY < 0) {
      newZoom = Math.min(3, newZoom + zoomSpeed); // Max 300%
    } else {
      newZoom = Math.max(0.1, newZoom - zoomSpeed); // Min 10%
    }

    // Apply the new zoom
    this.zoom = newZoom;
    this.onZoomChange(newZoom * 100);
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
      
      // Always scale grid layer when zooming (regardless of scaleGrid setting)
      // scaleGrid only affects independent grid zoom slider behavior
      if (this.gridLayer) {
        this.gridLayer.scale({ x: this.zoom, y: this.zoom });
      }

      // Scale tokens proportionally with zoom: apply zoom to both position and size
      this.tokens.forEach((tokenGroup, tokenId) => {
        const basePos = this.tokenBasePositions.get(tokenId);
        const baseSize = this.tokenBaseSizes.get(tokenId) || 20;
        const userScale = this.tokenUserScales.get(tokenId) || 1;
        
        if (basePos) {
          // Apply zoom to position
          tokenGroup.position({
            x: basePos.x * this.zoom,
            y: basePos.y * this.zoom
          });
        }
        
        // Apply zoom to size: scaledSize = baseSize * userScale * zoom
        const scaledSize = baseSize * userScale * this.zoom;
        const circle = tokenGroup.findOne('Circle') as Konva.Circle;
        if (circle) {
          circle.radius(scaledSize);
        }
        
        // Update token image to match the new size
        this.updateTokenImageSize(tokenId);
      });

      if (this.showGrid) {
        this.drawGrid();
      }

      this.stage.draw();
    }
  }

  onGridZoomChange(newGridZoom: number) {
    this.gridZoom = newGridZoom / 100; // Convert percentage to decimal
    if (this.gridLayer && this.stage) {
      this.gridLayer.scale({ x: this.gridZoom, y: this.gridZoom });
      if (this.showGrid) {
        this.drawGrid();
      }
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
    const scaleX = this.gridLayer.scaleX();
    const scaleY = this.gridLayer.scaleY();

    if (scaleX === 0 || scaleY === 0) {
      return;
    }

    // Convert the stage viewport into grid-layer coordinates so the grid remains
    // continuous when its layer is panned or zoomed.
    const gridX = this.gridLayer.x();
    const gridY = this.gridLayer.y();
    const visibleLeft = -gridX / scaleX;
    const visibleRight = (stageW - gridX) / scaleX;
    const visibleTop = -gridY / scaleY;
    const visibleBottom = (stageH - gridY) / scaleY;
    const minX = Math.floor(Math.min(visibleLeft, visibleRight) / cellWidth) * cellWidth;
    const maxX = Math.ceil(Math.max(visibleLeft, visibleRight) / cellWidth) * cellWidth;
    const minY = Math.floor(Math.min(visibleTop, visibleBottom) / cellHeight) * cellHeight;
    const maxY = Math.ceil(Math.max(visibleTop, visibleBottom) / cellHeight) * cellHeight;

    // Draw vertical lines
    for (let x = minX; x <= maxX; x += cellWidth) {
      const line = new Konva.Line({
        points: [x, minY, x, maxY],
        stroke: this.gridColor,
        strokeWidth: 1,
        opacity: 0.3,
      });
      this.gridLayer.add(line);
    }
    
    // Draw horizontal lines
    for (let y = minY; y <= maxY; y += cellHeight) {
      const line = new Konva.Line({
        points: [minX, y, maxX, y],
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

    this.attachTokenInteractions(tokenId, tokenGroup, circle);

    // Add right-click context menu
    tokenGroup.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.showTokenContextMenu(tokenId, e.evt);
    });

    this.tokenLayer.add(tokenGroup);
    this.tokens.set(tokenId, tokenGroup);
    this.tokenColors.set(tokenId, '#4a90e2'); // Store initial color
    this.tokenBasePositions.set(tokenId, { 
      x: this.stage.width() / 2, 
      y: this.stage.height() / 2 
    }); // Store base position (at 100% zoom)
    this.tokenBaseSizes.set(tokenId, 20); // Store base size (radius = 20)
    this.tokenUserScales.set(tokenId, 1); // Store user resize multiplier
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

    menu.appendChild(createButton('Delete toke', () => {
      this.deleteToken(tokenId);
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

  private deleteToken(tokenId: string): void {
    const tokenGroup = this.tokens.get(tokenId);
    if (tokenGroup) {
      tokenGroup.destroy();
    }
    this.tokens.delete(tokenId);
    this.tokenColors.delete(tokenId);
    this.tokenImages.delete(tokenId);
    this.tokenImageSources.delete(tokenId);
    this.tokenBasePositions.delete(tokenId);
    this.tokenBaseSizes.delete(tokenId);
    this.tokenUserScales.delete(tokenId);
    this.tokenRotations.delete(tokenId);
    this.selectedTokenIds.delete(tokenId);
    if (this.draggingTokenId === tokenId) {
      this.draggingTokenId = undefined;
    }
    this.tokenLayer?.draw();
  }

  private startSelection(event: MouseEvent): void {
    if (!this.stage || !this.tokenLayer) return;
    const pos = this.getTokenLayerPointerPosition();
    if (!pos) return;
    this.ctrlSelectActive = true;
    this.selectionStart = pos;
    this.selectedTokenIds.clear();
    this.updateSelectionHighlights();
    this.selectionRect?.destroy();
    this.selectionRect = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      stroke: '#f8e7ba',
      strokeWidth: 1,
      dash: [6, 4],
      fill: 'rgba(248, 231, 186, 0.12)',
      listening: false
    });
    this.tokenLayer.add(this.selectionRect);
    this.tokenLayer.draw();
    event.preventDefault();
  }

  private updateSelection(event: MouseEvent): void {
    if (!this.stage || !this.selectionRect || !this.selectionStart || !this.ctrlSelectActive) return;
    const pos = this.getTokenLayerPointerPosition();
    if (!pos) return;
    const x = Math.min(this.selectionStart.x, pos.x);
    const y = Math.min(this.selectionStart.y, pos.y);
    const width = Math.abs(pos.x - this.selectionStart.x);
    const height = Math.abs(pos.y - this.selectionStart.y);
    this.selectionRect.position({ x, y });
    this.selectionRect.size({ width, height });
    this.tokenLayer?.draw();
    event.preventDefault();
  }

  private finishSelection(): void {
    if (!this.stage || !this.selectionRect) return;
    const rect = this.selectionRect.getClientRect({ relativeTo: this.tokenLayer });
    this.selectedTokenIds.clear();
    this.tokens.forEach((group, tokenId) => {
      const box = group.getClientRect({ relativeTo: this.tokenLayer });
      const intersects = !(box.x > rect.x + rect.width || box.x + box.width < rect.x || box.y > rect.y + rect.height || box.y + box.height < rect.y);
      if (intersects) {
        this.selectedTokenIds.add(tokenId);
      }
    });
    this.selectionRect.destroy();
    this.selectionRect = undefined;
    this.selectionStart = undefined;
    this.ctrlSelectActive = false;
    this.updateSelectionHighlights();
    this.tokenLayer?.draw();
  }

  private moveSelectedTokens(deltaX: number, deltaY: number): void {
    if (this.selectedTokenIds.size === 0) return;
    this.selectedTokenIds.forEach(tokenId => {
      const token = this.tokens.get(tokenId);
      if (!token) return;
      const newX = token.x() + deltaX;
      const newY = token.y() + deltaY;
      token.x(newX);
      token.y(newY);
      this.tokenBasePositions.set(tokenId, { x: newX / this.zoom, y: newY / this.zoom });
    });
    this.tokenLayer?.draw();
    this.dragStartX += deltaX;
    this.dragStartY += deltaY;
  }

  private getTokenLayerPointerPosition(): { x: number; y: number } | undefined {
    const pointerPosition = this.stage?.getPointerPosition();
    if (!pointerPosition || !this.tokenLayer) return undefined;

    return this.tokenLayer.getAbsoluteTransform().copy().invert().point(pointerPosition);
  }

  private attachTokenInteractions(
    tokenId: string,
    tokenGroup: Konva.Group,
    circle: Konva.Circle
  ): void {
    tokenGroup.on('mouseover', () => {
      circle.fill('#5ba3ff');
      this.hoveredTokenId = tokenId;
      document.body.style.cursor = 'grab';
      this.stage?.draw();
    });

    tokenGroup.on('mouseout', () => {
      circle.fill(this.tokenColors.get(tokenId) || '#4a90e2');
      this.hoveredTokenId = undefined;
      document.body.style.cursor = 'default';
      this.stage?.draw();
    });

    tokenGroup.on('mousedown', (e) => {
      e.cancelBubble = true;
      if (e.evt.button !== 0) return;

      if (e.evt.ctrlKey) {
        this.startSelection(e.evt);
        return;
      }

      if (!this.selectedTokenIds.has(tokenId)) {
        this.selectedTokenIds.clear();
        this.selectedTokenIds.add(tokenId);
        this.updateSelectionHighlights();
      }

      this.draggingTokenId = tokenId;
      this.isDragging = true;
      this.dragStartX = e.evt.clientX;
      this.dragStartY = e.evt.clientY;
    });
  }

  private updateSelectionHighlights(): void {
    this.tokens.forEach((tokenGroup, tokenId) => {
      const circle = tokenGroup.findOne('Circle') as Konva.Circle | null;
      if (!circle) return;

      const isSelected = this.selectedTokenIds.has(tokenId);
      circle.stroke(isSelected ? '#f8e7ba' : '#2c5aa0');
      circle.strokeWidth(isSelected ? 4 : 2);
    });
  }

  private restoreSavedToken(saved: SavedMapTokenState): void {
    if (!this.stage || !this.tokenLayer) return;
    const tokenGroup = new Konva.Group({
      x: saved.x,
      y: saved.y,
      name: saved.id,
      draggable: false
    });
    const circle = new Konva.Circle({
      radius: 20 * (saved.scale || 1) * this.zoom,
      fill: saved.color,
      stroke: '#2c5aa0',
      strokeWidth: 2
    });
    const text = new Konva.Text({
      text: saved.name,
      fontSize: 12,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      width: 40,
      height: 40,
      x: -20,
      y: -20
    });
    tokenGroup.add(circle);
    tokenGroup.add(text);
    if (saved.rotation) {
      tokenGroup.rotation(saved.rotation);
    }
    this.attachTokenInteractions(saved.id, tokenGroup, circle);
    tokenGroup.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.showTokenContextMenu(saved.id, e.evt);
    });
    if (saved.image) {
      const img = new Image();
      img.onload = () => {
        const konvaImage = new Konva.Image({
          image: img,
          x: -circle.radius(),
          y: -circle.radius(),
          width: circle.radius() * 2,
          height: circle.radius() * 2
        });
        tokenGroup.add(konvaImage);
        this.tokenImages.set(saved.id, konvaImage);
        if (saved.image) {
          this.tokenImageSources.set(saved.id, saved.image);
        }
        this.updateTokenImageSize(saved.id);
        this.tokenLayer?.draw();
      };
      img.src = saved.image || '';
    }
    this.tokenLayer.add(tokenGroup);
    this.tokens.set(saved.id, tokenGroup);
    this.tokenColors.set(saved.id, saved.color);
    this.tokenBasePositions.set(saved.id, { x: saved.x, y: saved.y });
    this.tokenBaseSizes.set(saved.id, 20);
    this.tokenUserScales.set(saved.id, saved.scale || 1);
    this.tokenRotations.set(saved.id, saved.rotation);
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
          // Update image size to match the current token size (applies zoom)
          this.updateTokenImageSize(tokenId);
          this.tokenLayer.draw();
        }
      };
      img.src = e.target.result as string;
    };

    reader.readAsDataURL(file);
  }

  private updateTokenImageSize(tokenId: string) {
    const tokenGroup = this.tokens.get(tokenId);
    const konvaImage = this.tokenImages.get(tokenId);
    if (!tokenGroup || !konvaImage) return;

    // Calculate current size: baseSize * userScale * zoom
    const baseSize = this.tokenBaseSizes.get(tokenId) || 20;
    const userScale = this.tokenUserScales.get(tokenId) || 1;
    const scaledRadius = baseSize * userScale * this.zoom;
    const diameter = scaledRadius * 2;

    // Update image dimensions to match circle diameter
    konvaImage.width(diameter);
    konvaImage.height(diameter);
    // Re-center the image (offset from center)
    konvaImage.x(-scaledRadius);
    konvaImage.y(-scaledRadius);
  }

  private openResizeDialog(tokenId: string) {
    this.editingTokenId = tokenId;
    const currentScale = this.tokenUserScales.get(tokenId) || 1;
    this.tokenResizeOldValue = currentScale;
    this.tokenResizeValue = currentScale;
    this.showResizeDialog = true;
  }

  onTokenResizeChange(newSize: number) {
    if (!this.editingTokenId) return;

    const tokenGroup = this.tokens.get(this.editingTokenId);
    if (tokenGroup) {
      this.tokenUserScales.set(this.editingTokenId, newSize);
      
      // Recalculate token size: baseSize * userScale * zoom
      const baseSize = this.tokenBaseSizes.get(this.editingTokenId) || 20;
      const scaledSize = baseSize * newSize * this.zoom;
      const circle = tokenGroup.findOne('Circle') as Konva.Circle;
      if (circle) {
        circle.radius(scaledSize);
      }
      
      // Update token image to match the new size
      this.updateTokenImageSize(this.editingTokenId);
      
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
        this.tokenUserScales.set(this.editingTokenId, this.tokenResizeOldValue);
        
        // Recalculate token size: baseSize * userScale * zoom
        const baseSize = this.tokenBaseSizes.get(this.editingTokenId) || 20;
        const scaledSize = baseSize * this.tokenResizeOldValue * this.zoom;
        const circle = tokenGroup.findOne('Circle') as Konva.Circle;
        if (circle) {
          circle.radius(scaledSize);
        }
        
        // Update token image to match the new size
        this.updateTokenImageSize(this.editingTokenId);
        
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
      viewport: {
        offsetX: this.layer?.x() || 0,
        offsetY: this.layer?.y() || 0,
      },
      mapImage: this.getMapImageAsBase64(),
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

  private getMapImageAsBase64(): string | null {
    if (!this.mapImage) return null;

    const image = this.mapImage.image() as HTMLImageElement;
    if (!image) return null;

    try {
      const MAX_DIM = 2048;
      let w = image.width;
      let h = image.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch (e) {
      console.warn('Failed to serialize map image:', e);
    }
    return null;
  }

  private serializeTokens() {
    const tokensList: any[] = [];
    this.tokens.forEach((tokenGroup, tokenId) => {
      const textNode = tokenGroup.findOne('Text') as Konva.Text;
      const tokenName = textNode?.text() || 'Unnamed Token';
      
      const token = {
        id: tokenId,
        name: tokenName,
        x: this.tokenBasePositions.get(tokenId)?.x || tokenGroup.x(),
        y: this.tokenBasePositions.get(tokenId)?.y || tokenGroup.y(),
        scale: this.tokenUserScales.get(tokenId) || 1,
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
      const MAX_DIM = 256;
      let w = image.width;
      let h = image.height;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.7);
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
    if (!this.stage || !this.tokenLayer || !this.layer || !this.gridLayer) return;

    // Restore grid settings
    this.gridColor = mapData.gridSettings?.gridColor || '#000000';
    this.gridCellWidth = mapData.gridSettings?.gridCellWidth || 50;
    this.gridCellHeight = mapData.gridSettings?.gridCellHeight || 50;
    this.showGrid = mapData.gridSettings?.showGrid || false;

    // Restore zoom settings
    this.zoom = mapData.zoomSettings?.zoom || 1;
    this.scaleGrid = mapData.zoomSettings?.scaleGrid || false;
    this.gridZoom = mapData.zoomSettings?.gridZoom || 1;

    // Store viewport for later application
    const viewportOffsetX = mapData.viewport?.offsetX || 0;
    const viewportOffsetY = mapData.viewport?.offsetY || 0;

     // Clear existing tokens
    this.tokens.forEach((tokenGroup) => {
      tokenGroup.destroy();
    });
    this.tokens.clear();
    this.tokenColors.clear();
    this.tokenImages.clear();
    this.tokenBasePositions.clear();
    this.tokenBaseSizes.clear();
    this.tokenUserScales.clear();
    this.tokenRotations.clear();
    this.selectedTokenIds.clear();
    this.selectionRect?.destroy();
    this.selectionRect = undefined;
    this.selectionStart = undefined;

    // Restore map image if present (async)
    if (mapData.mapImage) {
      this.restoreMapImage(mapData.mapImage, () => {
        this.applyZoomAndGridSettings(viewportOffsetX, viewportOffsetY);
      });
    } else {
      // If no map image, apply zoom/grid settings immediately and restore tokens
      this.applyZoomAndGridSettings(viewportOffsetX, viewportOffsetY);
    }

    // Restore tokens
    mapData.tokens?.forEach((tokenData: any) => {
      this.restoreToken(tokenData);
    });

    this.tokenLayer.draw();
  }

  private applyZoomAndGridSettings(viewportOffsetX: number = 0, viewportOffsetY: number = 0) {
    if (!this.stage || !this.layer || !this.gridLayer) return;

    // Apply viewport offset (pan)
    this.layer.position({ x: viewportOffsetX, y: viewportOffsetY });
    this.gridLayer.position({ x: viewportOffsetX, y: viewportOffsetY });
    this.tokenLayer?.position({ x: viewportOffsetX, y: viewportOffsetY });

    // Apply zoom scale to image layer
    this.layer.scale({ x: this.zoom, y: this.zoom });

    // Apply grid scale
    if (this.scaleGrid) {
      this.gridLayer.scale({ x: this.zoom, y: this.zoom });
    } else {
      this.gridLayer.scale({ x: this.gridZoom, y: this.gridZoom });
    }

    // Redraw grid if needed
    if (this.showGrid) {
      this.drawGrid();
    }

    this.stage.draw();
  }

  private restoreMapImage(base64Image: string, onComplete?: () => void) {
    if (!this.stage || !this.layer) return;

    const img = new Image();
    img.onload = () => {
      this.addImageToLayer(img);
      onComplete?.();
    };
    img.onerror = () => {
      console.warn('Failed to restore map image');
      onComplete?.();
    };
    img.src = base64Image;
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

    this.attachTokenInteractions(tokenId, tokenGroup, circle);

    // Add right-click context menu
    tokenGroup.on('contextmenu', (e) => {
      e.evt.preventDefault();
      this.showTokenContextMenu(tokenId, e.evt);
    });

    this.tokenLayer.add(tokenGroup);
    this.tokens.set(tokenId, tokenGroup);
    this.tokenColors.set(tokenId, circleColor);
    this.tokenBasePositions.set(tokenId, { 
      x: tokenData.x || this.stage.width() / 2, 
      y: tokenData.y || this.stage.height() / 2 
    }); // Store base position from imported data
    this.tokenBaseSizes.set(tokenId, 20); // Base size is always 20 (radius)
    this.tokenUserScales.set(tokenId, tokenData.scale || 1); // Store user resize scale
    this.tokenRotations.set(tokenId, tokenData.rotation || 0);

    // Apply current zoom to position and size
    const scaledSize = 20 * (tokenData.scale || 1) * this.zoom;
    const circle2 = tokenGroup.findOne('Circle') as Konva.Circle;
    if (circle2) {
      circle2.radius(scaledSize);
    }
    
    tokenGroup.position({
      x: (tokenData.x || this.stage.width() / 2) * this.zoom,
      y: (tokenData.y || this.stage.height() / 2) * this.zoom
    });
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
      // Update image size to match the current token size (applies zoom)
      this.updateTokenImageSize(tokenId);
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
      this.tokenBasePositions.clear();
      this.tokenBaseSizes.clear();
      this.tokenUserScales.clear();
      this.tokenRotations.clear();
    } catch (e) {
      console.error('Failed to destroy Konva stage', e);
    }
  }

  ngOnDestroy() {
    if (this.stageInitializationTimeout !== undefined) {
      clearTimeout(this.stageInitializationTimeout);
      this.stageInitializationTimeout = undefined;
    }
    this.clearFullscreenControlHideTimeout();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    document.removeEventListener('mouseup', this.onDocumentMouseUp);
    this.destroyStage();
  }
}
