import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Tabletop');
  });

  it('keeps app content in the viewport below the sticky navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigation = compiled.querySelector('.app-navigation') as HTMLElement;
    const header = navigation.querySelector('header.site-header') as HTMLElement;
    const menu = compiled.querySelector('main-menu-button-bar') as HTMLElement;
    const main = compiled.querySelector('.main-content') as HTMLElement;
    const shell = compiled.querySelector('.app-shell') as HTMLElement;

    expect(navigation.children[0]).toBe(header);
    expect(navigation.children[1]).toBe(menu);
    expect(getComputedStyle(navigation).position).toBe('sticky');
    expect(getComputedStyle(navigation).top).toBe('0px');
    expect(getComputedStyle(menu).display).toBe('block');
    expect(getComputedStyle(main).overflowY).toBe('auto');
    expect(shell.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(
      main.getBoundingClientRect().bottom - 1,
    );
  });

  it('keeps character-sheet tabs in their visual hitbox below navigation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      currentView: 'character-sheet';
      addCharacterSheetTab(): void;
    };
    app.currentView = 'character-sheet';
    app.addCharacterSheetTab();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const navigation = compiled.querySelector('.app-navigation') as HTMLElement;
    const tab = compiled.querySelector('.character-sheet-tab') as HTMLButtonElement;
    const tabRect = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(
      tabRect.left + tabRect.width / 2,
      tabRect.top + tabRect.height / 2,
    );

    expect(tabRect.top).toBeGreaterThanOrEqual(navigation.getBoundingClientRect().bottom);
    expect(tab.contains(hit)).toBeTrue();
  });

  it('places map and NPC views below navigation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      currentView: 'game-map' | 'npc-maker';
    };
    const views = [
      { view: 'game-map' as const, selector: 'game-map-component' },
      { view: 'npc-maker' as const, selector: 'npc-maker-component' },
    ];

    for (const { view, selector } of views) {
      app.currentView = view;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const navigation = compiled.querySelector('.app-navigation') as HTMLElement;
      const viewHost = compiled.querySelector(selector) as HTMLElement;

      expect(viewHost.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        navigation.getBoundingClientRect().bottom,
      );
    }
  });

  it('anchors the hamburger menu to its button and keeps its menu interactive', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const bar = compiled.querySelector('.main-menu-button-bar') as HTMLElement;
    const wrapper = compiled.querySelector('.hamburger-wrapper') as HTMLElement;
    const button = wrapper.querySelector('.hamburger') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const menu = wrapper.querySelector('.hamburger-menu') as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const hit = document.elementFromPoint(
      menuRect.left + menuRect.width / 2,
      menuRect.top + menuRect.height / 2,
    );

    expect(getComputedStyle(wrapper).position).toBe('relative');
    expect(menu.offsetParent).toBe(wrapper);
    expect(menuRect.top).toBeGreaterThanOrEqual(buttonRect.bottom);
    expect(menuRect.right).toBeLessThanOrEqual(barRect.right + 1);
    expect(menu.contains(hit)).toBeTrue();
  });
});
