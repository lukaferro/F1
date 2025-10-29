import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GranPremiDetailComponent } from './gran-premi-detail.component';

describe('GranPremiDetailComponent', () => {
  let component: GranPremiDetailComponent;
  let fixture: ComponentFixture<GranPremiDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranPremiDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GranPremiDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
