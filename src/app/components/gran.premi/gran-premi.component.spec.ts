import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { GranPremiComponent } from './gran-premi.component';

describe('GranPremiComponent', () => {
	let component: GranPremiComponent;
	let fixture: ComponentFixture<GranPremiComponent>;

	beforeEach(async () => {
			await TestBed.configureTestingModule({
				imports: [GranPremiComponent, FormsModule, SelectModule, NoopAnimationsModule]
			}).compileComponents();

		fixture = TestBed.createComponent(GranPremiComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
