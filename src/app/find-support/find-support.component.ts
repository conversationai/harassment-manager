/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

import { SideMenuSection } from '../scrollable-side-menu/scrollable-side-menu.component';

interface SupportResource {
  name: string;
  image: string;
  url: string;
}

@Component({
  selector: 'app-find-support',
  templateUrl: './find-support.component.html',
  styleUrls: ['./find-support.component.scss'],
})
export class FindSupportComponent {
  sideMenuSections: SideMenuSection[] = [
    { title: 'Digital Safety Guides', anchorSelector: '.get-informed', selected: true },
    {
      title: 'Tools',
      anchorSelector: '.explore-digital-tools',
      selected: false,
    },
    {
      title: 'Organizations',
      anchorSelector: '.connect-with-organizations',
      selected: false,
    },
  ];

  digitalSafetyGuides: SupportResource[] = [
    {
      name: "Pen America",
      image: "/pen_amerrican_logo.svg",
      url: "https://onlineharassmentfieldmanual.pen.org/"
    },
    {
      name: "CPJ",
      image: "/cpj.svg",
      url: "https://cpj.org/campaigns/safety-women-nonbinary-journalists-online-offline/"
    },
    {
      name: "Open Internet for Democracy",
      image: "/opifd.svg",
      url: "https://openinternet.global/"
    }
  ]

  tools: SupportResource[] = [
    {
      name: "Digital Safetea",
      url: "https://digitalsafetea.com/",
      image: "/digital_safetea.svg"
    },
    {
      name: "Ayeta",
      url: "https://paradigmhq.org/programs/digital-rights/ayeta/",
      image: "/ayeta.svg"
    },
    {
      name: "Know Your Trolls",
      url: "https://learn.totem-project.org/courses/course-v1:IWMF+IWMF_OH_EN+001/about",
      image: "/totem.svg"
    },
    {
      name: "Outline VPN",
      url: "https://getoutline.org/",
      image: "/outline_vpn.svg"
    }
  ]
  organizations: SupportResource[] = [
    {
      name: "Coalition Against Online Violence",
      url: "https://onlineviolenceresponsehub.org/",
      image: "/ccri.svg"
    },
    {
      name: "Pen America",
      image: "/pen_amerrican_logo.svg",
      url: "https://onlineharassmentfieldmanual.pen.org/"
    },
    {
      name: "Article 19",
      url: "https://www.article19.org/",
      image: "/article_19.svg"
    },
    {
      name: "International Women's Media Foundation",
      url: "https://www.iwmf.org/",
      image: "/iwmf.svg"
    },
    {
      name: "African Women Journalism Project",
      url: "https://theawjp.org/",
      image: "/awjp.svg"
    },
    {
      name: "African Women In Media",
      url: "https://africanwomeninmedia.com/",
      image: "/african-women-in-media.svg"
    },
    {
      name: "iWatch Africa",
      url: "https://iwatchafrica.org/",
      image: "/iwatch-africa.svg"
    },
    {
      name: "Open Internet for Democracy",
      image: "/opifd.svg",
      url: "https://openinternet.global/"
    },
    {
      name: "The Digital Platform for Safety of Journalists in Africa",
      image: "/dpfsja.svg",
      url: "https://safetyofjournalistsinafrica.africa/"
    },
    {
      name: "Center for International Media Assistance",
      image: "/cfima.svg",
      url: "https://www.cima.ned.org/"
    },
    {
      name: "UNESCO Multi-Donor Programme on Freedom and Expression and Safety of Journalists",
      image: "/unesco.svg",
      url: "https://www.unesco.org/en/multi-donor-programme-freedom-expression-and-safety-journalists"
    },
    {
      name: "International Press Institute",
      image: "/international-press-institute.svg",
      url: "https://ipi.media/"
    },

  ]

  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer
  ) {
    this.iconRegistry.addSvgIcon(
      'medical_services',
      this.sanitizer.bypassSecurityTrustResourceUrl('/medical_services.svg')
    );
  }
}
