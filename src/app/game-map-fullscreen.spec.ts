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
