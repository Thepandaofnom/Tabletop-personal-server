import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameMapComponent } from '@tabletop/ui-components';
import Konva from 'konva';

describe('GameMapComponent fullscreen control', () => {
  let component: GameMapComponent;
  let stageContainer: HTMLDivElement;
  let stageWrapper: HTMLDivElement;
  let originalFullscreenElement: PropertyDescriptor | undefined;

  beforeEach(() => {
    component = new GameMapComponent();
    stageContainer = document.createElement('div');
    stageContainer.className = 'game-map-stage';
    stageWrapper = document.createElement('div');
    stageWrapper.className = 'game-map-stage-wrapper';
    stageWrapper.append(stageContainer);
    component.stageContainer = new ElementRef(stageContainer);
    originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
    component.ngAfterViewInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement);
    } else {
      delete (document as { fullscreenElement?: Element }).fullscreenElement;
    }
  });

  it('shows the fullscreen control panel during map pointer activity, then hides it after three seconds', () => {
    jasmine.clock().install();
    component.isFullscreen = true;

    component.onMapPointerMove();
    expect(component.showFullscreenControlPanel).toBeTrue();

    jasmine.clock().tick(3000);
    expect(component.showFullscreenControlPanel).toBeFalse();

    jasmine.clock().uninstall();
  });

  it('hides the fullscreen control panel until map pointer activity when the browser enters fullscreen', () => {
    component.showFullscreenControlPanel = true;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stageContainer,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(component.isFullscreen).toBeTrue();
    expect(component.showFullscreenControlPanel).toBeFalse();

    component.onMapPointerMove();
    expect(component.showFullscreenControlPanel).toBeTrue();
  });

  it('updates fullscreen state when the browser enters and exits fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stageContainer,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(component.isFullscreen).toBeTrue();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(component.isFullscreen).toBeFalse();
  });

  it('uses the fullscreen game-map-stage viewport box instead of its wrapper', () => {
    const normalWidth = 800;
    const normalHeight = 600;
    let fullscreenWidth = 1920;
    let fullscreenHeight = 1080;
    Object.defineProperties(stageContainer, {
      clientWidth: {
        configurable: true,
        get: () => (component.isFullscreen ? fullscreenWidth : normalWidth),
      },
      clientHeight: {
        configurable: true,
        get: () => (component.isFullscreen ? fullscreenHeight : normalHeight),
      },
    });
    spyOn(stageContainer, 'getBoundingClientRect').and.callFake(
      () =>
        ({
          width: component.isFullscreen ? fullscreenWidth : normalWidth,
          height: component.isFullscreen ? fullscreenHeight : normalHeight,
        }) as DOMRect,
    );
    spyOn(stageWrapper, 'getBoundingClientRect').and.callFake(
      () =>
        ({
          width: fullscreenWidth - 16,
          height: fullscreenHeight - 16,
        }) as DOMRect,
    );

    const stage = {
      width: jasmine.createSpy('width'),
      height: jasmine.createSpy('height'),
      draw: jasmine.createSpy('draw'),
      destroy: jasmine.createSpy('destroy'),
    };
    (component as unknown as { stage: typeof stage }).stage = stage;
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stageContainer,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(stageContainer.className).toBe('game-map-stage');
    expect(stageContainer.getBoundingClientRect().width).toBe(fullscreenWidth);
    expect(stageContainer.getBoundingClientRect().height).toBe(fullscreenHeight);
    expect(stageWrapper.getBoundingClientRect().width).toBe(fullscreenWidth - 16);
    expect(stageWrapper.getBoundingClientRect().height).toBe(fullscreenHeight - 16);
    expect(stage.width).toHaveBeenCalledWith(1920);
    expect(stage.height).toHaveBeenCalledWith(1080);

    fullscreenWidth = 1600;
    fullscreenHeight = 900;
    window.dispatchEvent(new Event('resize'));
    expect(stage.width).toHaveBeenCalledWith(1600);
    expect(stage.height).toHaveBeenCalledWith(900);

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(stage.width).toHaveBeenCalledWith(normalWidth);
    expect(stage.height).toHaveBeenCalledWith(normalHeight);
  });

  it('redraws the grid across resized viewport bounds after panning and zooming', () => {
    const stageContainer = document.createElement('div');
    let containerWidth = 960;
    let containerHeight = 720;
    Object.defineProperties(stageContainer, {
      clientWidth: { configurable: true, get: () => containerWidth },
      clientHeight: { configurable: true, get: () => containerHeight },
    });

    let stageWidth = 800;
    let stageHeight = 600;
    const stage = {
      width: jasmine.createSpy('width').and.callFake((value?: number) => {
        if (value !== undefined) {
          stageWidth = value;
        }
        return stageWidth;
      }),
      height: jasmine.createSpy('height').and.callFake((value?: number) => {
        if (value !== undefined) {
          stageHeight = value;
        }
        return stageHeight;
      }),
      draw: jasmine.createSpy('draw'),
      destroy: jasmine.createSpy('destroy'),
    };
    const lines: Konva.Line[] = [];
    const gridLayer = {
      destroyChildren: jasmine.createSpy('destroyChildren').and.callFake(() => lines.splice(0)),
      add: jasmine.createSpy('add').and.callFake((line: Konva.Line) => lines.push(line)),
      draw: jasmine.createSpy('draw'),
      destroy: jasmine.createSpy('destroy'),
      x: () => 240,
      y: () => -120,
      scaleX: () => 0.5,
      scaleY: () => 1.5,
    };
    const internal = component as unknown as {
      stage: Konva.Stage;
      gridLayer: Konva.Layer;
      onContainerResize(): void;
    };

    component.stageContainer = new ElementRef(stageContainer);
    component.showGrid = true;
    internal.stage = stage as unknown as Konva.Stage;
    internal.gridLayer = gridLayer as unknown as Konva.Layer;
    internal.onContainerResize();

    expect(stage.width).toHaveBeenCalledWith(containerWidth);
    expect(stage.height).toHaveBeenCalledWith(containerHeight);

    const verticalLines = lines.filter((line) => line.points()[0] === line.points()[2]);
    const horizontalLines = lines.filter((line) => line.points()[1] === line.points()[3]);
    expect(verticalLines.length).toBeGreaterThan(0);
    expect(horizontalLines.length).toBeGreaterThan(0);
    expect(
      verticalLines.every(
        (line) =>
          gridLayer.y() + gridLayer.scaleY() * line.points()[1] <= 0 &&
          gridLayer.y() + gridLayer.scaleY() * line.points()[3] >= containerHeight,
      ),
    ).toBeTrue();
    expect(
      horizontalLines.every(
        (line) =>
          gridLayer.x() + gridLayer.scaleX() * line.points()[0] <= 0 &&
          gridLayer.x() + gridLayer.scaleX() * line.points()[2] >= containerWidth,
      ),
    ).toBeTrue();

    containerWidth = 1200;
    containerHeight = 900;
    internal.onContainerResize();

    const resizedVerticalLines = lines.filter((line) => line.points()[0] === line.points()[2]);
    const resizedHorizontalLines = lines.filter((line) => line.points()[1] === line.points()[3]);
    expect(
      resizedVerticalLines.every(
        (line) =>
          gridLayer.y() + gridLayer.scaleY() * line.points()[1] <= 0 &&
          gridLayer.y() + gridLayer.scaleY() * line.points()[3] >= containerHeight,
      ),
    ).toBeTrue();
    expect(
      resizedHorizontalLines.every(
        (line) =>
          gridLayer.x() + gridLayer.scaleX() * line.points()[0] <= 0 &&
          gridLayer.x() + gridLayer.scaleX() * line.points()[2] >= containerWidth,
      ),
    ).toBeTrue();
  });

  it('requests and exits fullscreen from the map control', () => {
    const requestFullscreen = spyOn(stageContainer, 'requestFullscreen').and.returnValue(Promise.resolve());
    component.toggleFullscreen(new MouseEvent('click'));
    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: stageContainer,
    });
    const exitFullscreen = spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());
    component.toggleFullscreen(new MouseEvent('click'));
    expect(exitFullscreen).toHaveBeenCalled();
  });
});

describe('GameMapComponent control panel rendering', () => {
  let fixture: ComponentFixture<GameMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameMapComponent);
    spyOn(fixture.componentInstance, 'ngAfterViewInit').and.stub();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('keeps the map control panel visible and interactive in normal mode', () => {
    const panel = fixture.nativeElement.querySelector('.game-map-control-panel') as HTMLElement;
    const styles = getComputedStyle(panel);

    expect(panel).toBeTruthy();
    expect(panel.classList.contains('is-visible')).toBeTrue();
    expect(styles.display).toBe('flex');
    expect(styles.visibility).toBe('visible');
    expect(styles.opacity).toBe('1');
    expect(styles.pointerEvents).toBe('auto');
  });

  it('hides fullscreen controls until pointer activity, then hides them after three seconds', () => {
    jasmine.clock().install();
    const component = fixture.componentInstance;
    const panel = fixture.nativeElement.querySelector('.game-map-control-panel') as HTMLElement;

    try {
      component.isFullscreen = true;
      component.showFullscreenControlPanel = false;
      fixture.detectChanges();
      expect(panel.classList.contains('is-visible')).toBeFalse();

      component.onMapPointerMove();
      fixture.detectChanges();
      expect(panel.classList.contains('is-visible')).toBeTrue();

      jasmine.clock().tick(3000);
      fixture.detectChanges();
      expect(panel.classList.contains('is-visible')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
