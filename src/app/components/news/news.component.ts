import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute, { optional: true });

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
  articleLoading = false;

  selectedCategory: NewsCategory = 'Tutte';
  searchQuery = '';
  loading = false;

  async ngOnInit(): Promise<void> {
    this.selectedCategory = this.stateService.selectedCategory;
    this.searchQuery = this.stateService.searchQuery;
    await this.loadNews();

    const targetArticleId = this.route?.snapshot?.queryParamMap?.get('article');
    if (targetArticleId) {
      const match = this.articles.find(a => a.id === targetArticleId);
      if (match) {
        await this.openArticleModal(match);
      }
    }
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

  async openArticleModal(article: F1NewsArticle): Promise<void> {
    this.selectedArticle = article;
    if (!article.fullContentLoaded) {
      this.articleLoading = true;
      try {
        await this.newsService.fetchFullArticle(article);
      } finally {
        if (this.selectedArticle?.id === article.id) {
          this.articleLoading = false;
        }
      }
    } else {
      this.articleLoading = false;
    }
  }

  closeArticleModal(): void {
    this.selectedArticle = null;
    this.articleLoading = false;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    const fallback = 'https://www.datocms-assets.com/53444/1718265294-formula-one-vs-indycar-racing.jpg?auto=format&w=1200';
    if (img.src !== fallback) {
      img.src = fallback;
    }
  }
}
