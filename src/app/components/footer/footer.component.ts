import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface FooterNavItem {
  label: string;
  route: string;
}

export interface FooterSourceLink {
  label: string;
  url: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();

  readonly navLinks: FooterNavItem[] = [
    { label: 'Home', route: '/' },
    { label: 'Gran Premi', route: '/granpremi' },
    { label: 'Circuiti', route: '/circuits' },
    { label: 'Piloti', route: '/drivers' },
    { label: 'Scuderie', route: '/scuderie' },
    { label: 'Classifiche & Albo d\'Oro', route: '/classifiche' },
    { label: 'News', route: '/news' }
  ];

  readonly dataSources: FooterSourceLink[] = [
    { label: 'OpenF1 API', url: 'https://openf1.org' },
    { label: 'Jolpica F1', url: 'https://github.com/jolpica/jolpica-f1' },
    { label: 'Wikipedia', url: 'https://it.wikipedia.org/wiki/Formula_1' },
    { label: 'Formula1.com', url: 'https://www.formula1.com' }
  ];
}
