import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationDlgComponent } from './confirmation-dlg.component';

describe('ConfirmationDlgComponent', () => {
  let component: ConfirmationDlgComponent;
  let fixture: ComponentFixture<ConfirmationDlgComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ConfirmationDlgComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
      fixture = TestBed.createComponent(ConfirmationDlgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
