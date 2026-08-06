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

  it('keeps the main menu below the header in the shared sticky navigation flow', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navigation = compiled.querySelector('.app-navigation') as HTMLElement;
    const header = navigation.querySelector('header.site-header') as HTMLElement;
    const menu = compiled.querySelector('main-menu-button-bar') as HTMLElement;

    expect(navigation.children[0]).toBe(header);
    expect(navigation.children[1]).toBe(menu);
    expect(getComputedStyle(navigation).position).toBe('sticky');
    expect(getComputedStyle(navigation).top).toBe('0px');
    expect(getComputedStyle(menu).display).toBe('block');

    const initialScrollY = window.scrollY;
    window.scrollTo(0, header.getBoundingClientRect().height + 1);

    try {
      const headerRect = header.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const firstButton = menu.querySelector('button') as HTMLButtonElement;
      const buttonRect = firstButton.getBoundingClientRect();
      const elementAtButtonCenter = document.elementFromPoint(
        buttonRect.left + buttonRect.width / 2,
        buttonRect.top + buttonRect.height / 2,
      );

      expect(menuRect.top).toBeGreaterThanOrEqual(headerRect.bottom);
      expect(firstButton.contains(elementAtButtonCenter)).toBeTrue();
    } finally {
      window.scrollTo(0, initialScrollY);
    }
  });
});
