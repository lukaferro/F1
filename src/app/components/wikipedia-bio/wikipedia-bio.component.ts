import { Component, Input, OnChanges, inject } from '@angular/core';

import { WikipediaBio, WikipediaService } from '../../services/wikipedia.service';

// Pannello "Profilo" dei piloti: testo introduttivo di Wikipedia, in italiano quando c'è
@Component({
  selector: 'app-wikipedia-bio',
  standalone: true,
  templateUrl: './wikipedia-bio.component.html',
  styleUrls: ['./wikipedia-bio.component.css']
})
export class WikipediaBioComponent implements OnChanges {
  private readonly wikipedia = inject(WikipediaService);

  /** Titolo della pagina inglese (da Jolpica): con questo bastano 2 richieste */
  @Input() title?: string;
  /** Nome per la ricerca quando il titolo non c'è */
  @Input({ required: true }) name!: string;
  /** true finché il padre non sa se avrà un titolo: skeleton senza richieste */
  @Input() waiting = false;

  bio: WikipediaBio | null = null;
  loading = true;

  // le risposte di una ricerca superata (pilota cambiato) vengono ignorate
  private loadSeq = 0;

  async ngOnChanges(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.bio = null;
    if (this.waiting) return;
    const bio = await this.wikipedia.getBio({ title: this.title, name: this.name });
    if (seq !== this.loadSeq) return;
    this.bio = bio;
    this.loading = false;
  }
}
