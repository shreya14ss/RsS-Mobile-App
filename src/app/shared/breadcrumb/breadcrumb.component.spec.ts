import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

import { BreadcrumbComponent, BCSelectionClass } from './breadcrumb.component';
import { AppService } from 'src/app/core/services/app.service';
import { SignalRService } from 'src/app/core/services/signal-r.service';

// ─── Stubs ────────────────────────────────────────────────────────────────────

class AppServiceStub {
  viewData: any = { id: 'test-id', view: 'test-view' };
}

class SignalRServiceStub {
  // Signature matches: getProjectViewDetails(id, path, view, params)
  getProjectViewDetails = jasmine.createSpy('getProjectViewDetails').and.returnValue(
    Promise.resolve({ view: 'test-view' })
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeSelection(
  levels: Array<{ elements: string[]; sel?: number; parent?: string }>
): BCSelectionClass[] {
  return levels.map(l => ({
    sel_index: l.sel !== undefined ? l.sel : undefined,
    parent_route: l.parent ?? '/root/',
    elements: l.elements.map(n => ({ name: n, route: n.toLowerCase() }))
  }));
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;
  let routerEvents$: Subject<any>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    routerEvents$ = new Subject();

    // Provide Router as a full spy — do NOT import RouterTestingModule as it
    // registers its own Router and would shadow this provider.
    routerSpy = jasmine.createSpyObj<Router>(
      'Router',
      ['navigateByUrl', 'navigate'],
      { events: routerEvents$.asObservable() }
    );

    TestBed.configureTestingModule({
      declarations: [BreadcrumbComponent],
      imports: [
        IonicModule.forRoot(),
        FormsModule
      ],
      providers: [
        { provide: Router,        useValue: routerSpy },
        { provide: AppService,    useClass: AppServiceStub },
        { provide: SignalRService, useClass: SignalRServiceStub }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Instantiation ─────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Back / Forward ────────────────────────────────────────────────────────

  describe('back / forward', () => {

    it('canGoBack and canGoForward are both false on init', () => {
      expect(component.canGoBack).toBeFalse();
      expect(component.canGoForward).toBeFalse();
    });

    it('records navigation events and enables canGoBack', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      routerEvents$.next(new NavigationEnd(2, '/b', '/b'));
      expect(component.canGoBack).toBeTrue();
      expect(component.canGoForward).toBeFalse();
    });

    it('goBack navigates to the previous URL', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      routerEvents$.next(new NavigationEnd(2, '/b', '/b'));

      component.goBack();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/a');
      // historyIndex is now 0 — back disabled, forward enabled
      expect(component.canGoBack).toBeFalse();
      expect(component.canGoForward).toBeTrue();
    });

    it('goForward navigates to the next URL after goBack', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      routerEvents$.next(new NavigationEnd(2, '/b', '/b'));

      component.goBack();   // historyIndex → 0, skipNext = true
      // The NavigationEnd that the real router would fire is suppressed by skipNext.
      // We don't fire one here — that correctly mirrors the skipNext mechanism.
      component.goForward(); // historyIndex → 1

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/b');
      expect(component.canGoForward).toBeFalse();
    });

    it('new navigation after goBack truncates forward history', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      routerEvents$.next(new NavigationEnd(2, '/b', '/b'));

      component.goBack(); // historyIndex → 0, skipNext = true
      // The NavigationEnd from goBack itself is skipped (skipNext consumed).
      // Now a brand-new user navigation arrives — it should truncate /b.
      routerEvents$.next(new NavigationEnd(3, '/c', '/c'));

      expect(component.canGoForward).toBeFalse();
    });

    it('goBack does nothing when already at oldest entry', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      component.goBack();
      expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
    });

    it('goForward does nothing when already at newest entry', () => {
      routerEvents$.next(new NavigationEnd(1, '/a', '/a'));
      component.goForward();
      expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  // ── Previous / Next sibling ───────────────────────────────────────────────

  describe('prev / next sibling', () => {

    it('canGoPrev is false with empty selection', () => {
      component.Selection = [];
      expect(component.canGoPrev).toBeFalse();
    });

    it('canGoPrev is false when only one element in last level', () => {
      component.Selection = makeSelection([{ elements: ['Alpha'], sel: 0 }]);
      expect(component.canGoPrev).toBeFalse();
    });

    it('canGoPrev is true when last level has multiple elements', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta'], sel: 1 }]);
      expect(component.canGoPrev).toBeTrue();
    });

    it('canGoPrev is false when last level has no sel_index and only one level exists', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta'] }]); // no sel
      expect(component.canGoPrev).toBeFalse();
    });

    it('uses second-to-last level when last has no sel_index', () => {
      component.Selection = makeSelection([
        { elements: ['Alpha', 'Beta'], sel: 0 },
        { elements: ['Child1', 'Child2'] }   // no sel_index → falls back to level 0
      ]);
      expect(component.canGoPrev).toBeTrue();
    });

    it('goPrev decrements index', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta', 'Gamma'], sel: 1 }]);
      spyOn(component, 'navigateToItem');
      component.goPrev();
      const target = component.Selection[0];
      expect(component.navigateToItem).toHaveBeenCalledWith(target, target.elements[0]);
    });

    it('goPrev wraps from index 0 to last element', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta', 'Gamma'], sel: 0 }]);
      spyOn(component, 'navigateToItem');
      component.goPrev();
      const target = component.Selection[0];
      expect(component.navigateToItem).toHaveBeenCalledWith(target, target.elements[2]);
    });

    it('goNext increments index', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta', 'Gamma'], sel: 0 }]);
      spyOn(component, 'navigateToItem');
      component.goNext();
      const target = component.Selection[0];
      expect(component.navigateToItem).toHaveBeenCalledWith(target, target.elements[1]);
    });

    it('goNext wraps from last index to first element', () => {
      component.Selection = makeSelection([{ elements: ['Alpha', 'Beta', 'Gamma'], sel: 2 }]);
      spyOn(component, 'navigateToItem');
      component.goNext();
      const target = component.Selection[0];
      expect(component.navigateToItem).toHaveBeenCalledWith(target, target.elements[0]);
    });
  });

  // ── Down / Up ─────────────────────────────────────────────────────────────

  describe('down / up', () => {

    it('canGoDown is true when last level has no sel_index and has elements', () => {
      component.Selection = makeSelection([{ elements: ['A', 'B'] }]);
      expect(component.canGoDown).toBeTrue();
    });

    it('canGoDown is false when last level has a sel_index', () => {
      component.Selection = makeSelection([{ elements: ['A', 'B'], sel: 0 }]);
      expect(component.canGoDown).toBeFalse();
    });

    it('canGoDown is false with empty selection', () => {
      component.Selection = [];
      expect(component.canGoDown).toBeFalse();
    });

    it('goDown navigates to first element of last level', () => {
      component.Selection = makeSelection([{ elements: ['A', 'B'] }]);
      spyOn(component, 'navigateToItem');
      component.goDown();
      const last = component.Selection[0];
      expect(component.navigateToItem).toHaveBeenCalledWith(last, last.elements[0]);
    });

    it('canGoUp requires >= 2 levels when last has sel_index', () => {
      component.Selection = makeSelection([{ elements: ['A'], sel: 0 }]);
      expect(component.canGoUp).toBeFalse();

      component.Selection = makeSelection([
        { elements: ['A'], sel: 0 },
        { elements: ['B'], sel: 0 }
      ]);
      expect(component.canGoUp).toBeTrue();
    });

    it('canGoUp requires >= 3 levels when last has no sel_index', () => {
      component.Selection = makeSelection([
        { elements: ['A'], sel: 0 },
        { elements: ['B'] }
      ]);
      expect(component.canGoUp).toBeFalse();

      component.Selection = makeSelection([
        { elements: ['A'], sel: 0 },
        { elements: ['B'], sel: 0 },
        { elements: ['C'] }
      ]);
      expect(component.canGoUp).toBeTrue();
    });

    it('goUp navigates to parent_route of last level when sel_index exists', () => {
      component.Selection = makeSelection([
        { elements: ['A'], sel: 0, parent: '/level0/' },
        { elements: ['B'], sel: 0, parent: '/level1/' }
      ]);
      component.goUp();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/level1/'],
        jasmine.objectContaining({ queryParamsHandling: 'merge' })
      );
    });

    it('goUp navigates to second-to-last parent_route when last has no sel_index', () => {
      component.Selection = makeSelection([
        { elements: ['A'], sel: 0, parent: '/level0/' },
        { elements: ['B'], sel: 0, parent: '/level1/' },
        { elements: ['C'], parent: '/level2/' }
      ]);
      component.goUp();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/level1/'],
        jasmine.objectContaining({ queryParamsHandling: 'merge' })
      );
    });
  });

  // ── Level menu ────────────────────────────────────────────────────────────

  describe('level menu', () => {

    it('openLevelMenu sets activeDropdown, resets searchText, opens popover', () => {
      const sel = makeSelection([{ elements: ['X', 'Y'], sel: 0 }])[0];
      component.searchText = 'stale';
      component.openLevelMenu(sel);
      expect(component.levelMenuOpen).toBeTrue();
      expect(component.activeDropdown).toBe(sel);
      expect(component.searchText).toBe('');
    });

    it('closeLevelMenu resets all level-menu state', () => {
      component.levelMenuOpen = true;
      component.activeDropdown = makeSelection([{ elements: ['X'], sel: 0 }])[0];
      component.searchText = 'query';
      component.closeLevelMenu();
      expect(component.levelMenuOpen).toBeFalse();
      expect(component.activeDropdown).toBeNull();
      expect(component.searchText).toBe('');
    });

    it('selectItem closes the menu and calls navigateToItem', async () => {
      const sel = makeSelection([{ elements: ['X', 'Y'], sel: 0 }])[0];
      spyOn(component, 'navigateToItem').and.returnValue(Promise.resolve());
      component.levelMenuOpen = true;
      component.activeDropdown = sel;

      await component.selectItem(sel, sel.elements[1]);

      expect(component.levelMenuOpen).toBeFalse();
      expect(component.navigateToItem).toHaveBeenCalledWith(sel, sel.elements[1]);
    });
  });

  // ── filterMenuElements ────────────────────────────────────────────────────

  describe('filterMenuElements', () => {

    const sel = (): BCSelectionClass => ({
      sel_index: 0,
      parent_route: '/',
      elements: [
        { name: 'Alpha Project', route: 'alpha' },
        { name: 'Beta%20Site',   route: 'beta'  },
        { name: 'Gamma Build',   route: 'gamma' }
      ]
    });

    it('returns all elements when term is empty', () => {
      expect(component.filterMenuElements(sel(), '').length).toBe(3);
    });

    it('filters case-insensitively against the decoded display name', () => {
      // 'Beta%20Site' decodes to 'Beta Site'; searching 'site' should match it
      const result = component.filterMenuElements(sel(), 'site');
      expect(result.length).toBe(1);
      expect(result[0].route).toBe('beta');
    });

    it('returns empty array when nothing matches', () => {
      expect(component.filterMenuElements(sel(), 'zzz').length).toBe(0);
    });

    it('returns all elements for a null/undefined selitem gracefully', () => {
      expect(component.filterMenuElements(null, '')).toEqual([]);
    });
  });

  // ── unescapedName ─────────────────────────────────────────────────────────

  describe('unescapedName', () => {

    it('decodes percent-encoded names', () => {
      expect(component.unescapedName('Hello%20World')).toBe('Hello World');
    });

    it('returns the original string when decoding fails', () => {
      expect(component.unescapedName('%ZZ')).toBe('%ZZ');
    });

    it('returns empty string for empty input', () => {
      expect(component.unescapedName('')).toBe('');
    });

    it('returns empty string for null input', () => {
      expect(component.unescapedName(null)).toBe('');
    });
  });

  // ── Template menu ─────────────────────────────────────────────────────────

  describe('template menu', () => {

    it('createTemplate closes templateMenuOpen', () => {
      component.templateMenuOpen = true;
      component.createTemplate();
      expect(component.templateMenuOpen).toBeFalse();
    });

    it('importTemplate closes templateMenuOpen', () => {
      component.templateMenuOpen = true;
      component.importTemplate();
      expect(component.templateMenuOpen).toBeFalse();
    });
  });
});