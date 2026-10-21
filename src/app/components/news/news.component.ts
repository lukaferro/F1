import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { NewsService, F1NewsArticle } from '../../services/news.service';
import { NewsStateService, NewsCategory } from '../../services/news-state.service';

@Component({
  selector: 'app-news',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, InputTextModule],
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.css']
})
export class NewsComponent implements OnInit {
  private readonly newsService = inject(NewsService);
  private readonly stateService = inject(NewsStateService);

  readonly categories: NewsCategory[] = [
    'Tutte',
    'Gare & Paddock',
    'Scuderie',
    'Piloti',
    'Tecnica'
  ];

  articles: F1NewsArticle[] = [];
  filteredArticles: F1NewsArticle[] = [];
  selectedArticle: F1NewsArticle | null = null;

  selectedCategory: NewsCategory = 'Tutte';
  searchQuery = '';
  loading = false;

  async ngOnInit(): Promise<void> {
    this.selectedCategory = this.stateService.selectedCategory;
    this.searchQuery = this.stateService.searchQuery;
    await this.loadNews();
  }

  async loadNews(forceRefresh = false): Promise<void> {
    this.loading = true;
    try {
      this.articles = await this.newsService.getLatestNews(forceRefresh);
      this.applyFilters();
    } finally {
      this.loading = false;
    }
  }

  selectCategory(category: NewsCategory): void {
    this.selectedCategory = category;
    this.saveState();
    this.applyFilters();
  }

  onSearchChange(): void {
    this.saveState();
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCategory = 'Tutte';
    this.searchQuery = '';
    this.saveState();
    this.applyFilters();
  }

  private saveState(): void {
    this.stateService.selectedCategory = this.selectedCategory;
    this.stateService.searchQuery = this.searchQuery;
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredArticles = this.articles.filter(article => {
      const matchesCategory =
        this.selectedCategory === 'Tutte' || article.category === this.selectedCategory;
      const matchesSearch =
        !query ||
        article.title.toLowerCase().includes(query) ||
        article.summary.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query) ||
        article.source.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }

  get featuredArticle(): F1NewsArticle | null {
    return this.filteredArticles.length > 0 ? this.filteredArticles[0] : null;
  }

  get gridArticles(): F1NewsArticle[] {
    return this.filteredArticles.length > 1 ? this.filteredArticles.slice(1) : [];
  }

  countByCategory(category: NewsCategory): number {
    if (category === 'Tutte') return this.articles.length;
    return this.articles.filter(a => a.category === category).length;
  }

  openArticleModal(article: F1NewsArticle): void {
    this.selectedArticle = article;
  }

  closeArticleModal(): void {
    this.selectedArticle = null;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const fallback = 'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200';
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}
