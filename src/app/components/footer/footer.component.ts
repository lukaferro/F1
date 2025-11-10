import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type SponsorLogo = {
  name: string;
  logo: string;
  website: string;
};
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})

export class FooterComponent {
  currentYear = new Date().getFullYear();
  sponsorPartners: SponsorLogo[] = [
    {
      name: 'Rolex',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/rolex.webp',
      website: 'https://www.rolex.com'
    },
    {
      name: 'Pirelli',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/pirelli.webp',
      website: 'https://www.pirelli.com'
    },
    {
      name: 'DHL',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/dhl.webp',
      website: 'https://www.dhl.com'
    },
    {
      name: 'Heineken',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/heineken.webp',
      website: 'https://www.heineken.com'
    },
    {
      name: 'Aramco',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/aramco.webp',
      website: 'https://www.aramco.com'
    },
    {
      name: 'AWS',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/AWS%20GLOBAL.webp',
      website: 'https://aws.amazon.com/it/f1insights/'
    },
    {
      name: 'Qatar Airways',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/qatar.webp',
      website: 'https://www.qatarairways.com'
    },
    {
      name: 'Crypto.com',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/crypto.com.webp',
      website: 'https://crypto.com'
    },
    {
      name: 'MSC Cruises',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/msc.webp',
      website: 'https://www.msccruises.com'
    },
    {
      name: 'Lenovo',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/lenovo.webp',
      website: 'https://www.lenovo.com'
    },
    {
      name: 'LVMH',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/fom-website/2020/sponsors/lvmh.webp',
      website: 'https://www.lvmh.com'
    },
    {
      name: 'Louis Vuitton',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/fom-website/2020/sponsors/louis%20vuitton.webp',
      website: 'https://www.louisvuitton.com'
    },
    {
      name: 'Santander',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/fom-website/2020/sponsors/santander.webp',
      website: 'https://www.santander.com'
    },
    {
      name: 'Moët Hennessy',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/fom-website/2020/sponsors/moet%20hennessy.webp',
      website: 'https://www.moet-hennessy.com'
    },
    {
      name: 'BBS',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/BBS.webp',
      website: 'https://www.bbs.com'
    },
    {
      name: 'Puma',
      logo: 'https://media.formula1.com/image/upload/e_trim/c_fit,w_160,h_90/q_auto/v1740000000/content/dam/fom-website/2020/sponsors/puma.webp',
      website: 'https://www.puma.com'
    }
  ];
}
