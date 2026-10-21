import { TestBed } from '@angular/core/testing';
import { NewsComponent } from './news.component';
import { NewsService, CURATED_F1_NEWS } from '../../services/news.service';
import { NewsStateService } from '../../services/news-state.service';

describe('NewsComponent', () => {
  let newsMock: {
    getLatestNews: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    newsMock = {
      getLatestNews: vi.fn().mockResolvedValue(CURATED_F1_NEWS)
    };

    await TestBed.configureTestingModule({
      imports: [NewsComponent],
      providers: [
        { provide: NewsService, useValue: newsMock }
      ]
    }).compileComponents();
  });

  it('should load articles, display featured article and grid articles', async () => {
    const fixture = TestBed.createComponent(NewsComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();

    expect(component.articles.length).toBe(CURATED_F1_NEWS.length);
    expect(component.featuredArticle?.id).toBe(CURATED_F1_NEWS[0].id);
    expect(component.gridArticles.length).toBe(CURATED_F1_NEWS.length - 1);
  });

  it('should filter articles by category and search query and persist in NewsStateService', async () => {
    const fixture = TestBed.createComponent(NewsComponent);
    const component = fixture.componentInstance;
    const state = TestBed.inject(NewsStateService);
    await component.ngOnInit();

    component.selectCategory('Tecnica');
    expect(state.selectedCategory).toBe('Tecnica');
    expect(component.filteredArticles.every(a => a.category === 'Tecnica')).toBe(true);

    component.searchQuery = 'Ferrari';
    component.selectCategory('Tutte');
    component.onSearchChange();
    expect(state.searchQuery).toBe('Ferrari');
    expect(component.filteredArticles.some(a => a.title.includes('Ferrari'))).toBe(true);
  });

  it('should open and close the article reader modal', async () => {
    const fixture = TestBed.createComponent(NewsComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    component.openArticleModal(CURATED_F1_NEWS[0]);
    expect(component.selectedArticle).toEqual(CURATED_F1_NEWS[0]);

    component.closeArticleModal();
    expect(component.selectedArticle).toBeNull();
  });
});
