import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { DateTimeSelectionDlgComponent } from './date-time-selection-dlg.component';


describe('DateTimeSelectionDlgComponent', () => {
  let component: DateTimeSelectionDlgComponent;
  let fixture: ComponentFixture<DateTimeSelectionDlgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DateTimeSelectionDlgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DateTimeSelectionDlgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
