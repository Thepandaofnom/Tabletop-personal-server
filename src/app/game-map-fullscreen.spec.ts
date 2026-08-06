import { ElementRef } from '@angular/core';
import { GameMapComponent } from '@tabletop/ui-components';

describe('GameMapComponent fullscreen control', () => {
  let component: GameMapComponent;
  let fullscreenContainer: HTMLDivElement;
  let originalFullscreenElement: PropertyDescriptor | undefined;

  beforeEach(() => {
    component = new GameMapComponent();
    fullscreenContainer = document.createElement('div');
    component.fullscreenContainer = new ElementRef(fullscreenContainer);
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

  it('shows the control during map pointer activity, then hides it after three seconds', () => {
    jasmine.clock().install();

    component.onMapPointerMove();
    expect(component.showFullscreenControl).toBeTrue();

    jasmine.clock().tick(3000);
    expect(component.showFullscreenControl).toBeFalse();

    jasmine.clock().uninstall();
  });

  it('updates fullscreen state when the browser enters and exits fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: fullscreenContainer,
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

  it('sizes the stage from the fullscreen element and restores the stage container size on exit', () => {
    const stageContainer = document.createElement('div');
    Object.defineProperties(stageContainer, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 600 },
    });
    Object.defineProperties(fullscreenContainer, {
      clientWidth: { configurable: true, value: 1920 },
      clientHeight: { configurable: true, value: 1080 },
    });

    const stage = {
      width: jasmine.createSpy('width'),
      height: jasmine.createSpy('height'),
      draw: jasmine.createSpy('draw'),
      destroy: jasmine.createSpy('destroy'),
    };
    component.stageContainer = new ElementRef(stageContainer);
    (component as unknown as { stage: typeof stage }).stage = stage;
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: fullscreenContainer,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(stage.width).toHaveBeenCalledWith(1920);
    expect(stage.height).toHaveBeenCalledWith(1080);

    Object.defineProperties(fullscreenContainer, {
      clientWidth: { configurable: true, value: 1600 },
      clientHeight: { configurable: true, value: 900 },
    });
    window.dispatchEvent(new Event('resize'));
    expect(stage.width).toHaveBeenCalledWith(1600);
    expect(stage.height).toHaveBeenCalledWith(900);

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(stage.width).toHaveBeenCalledWith(800);
    expect(stage.height).toHaveBeenCalledWith(600);
  });

  it('requests and exits fullscreen from the map control', () => {
    const requestFullscreen = spyOn(fullscreenContainer, 'requestFullscreen').and.returnValue(Promise.resolve());
    component.toggleFullscreen(new MouseEvent('click'));
    expect(requestFullscreen).toHaveBeenCalled();

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: fullscreenContainer,
    });
    const exitFullscreen = spyOn(document, 'exitFullscreen').and.returnValue(Promise.resolve());
    component.toggleFullscreen(new MouseEvent('click'));
    expect(exitFullscreen).toHaveBeenCalled();
  });
});
