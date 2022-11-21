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
    { title: 'Interactive Lessons', anchorSelector: '.interactive-lessons', selected: true },
    {
      title: 'Resource Kits',
      anchorSelector: '.resource-kits',
      selected: false,
    },
    {
      title: 'Tools',
      anchorSelector: '.tools',
      selected: false,
    },
    {
      title: 'Organisations',
      anchorSelector: '.organisations',
      selected: false,
    },
  ];
  interactiveLessons: SupportResource[] = [
    {
      name: "Digital Safetea",
      image: "/digital_safetea.svg",
      url: "https://digitalsafetea.com/",
    },
    {
      name: "Know Your Trolls",
      image: "/totem.svg",
      url: "https://learn.totem-project.org/courses/course-v1:IWMF+IWMF_OH_EN+001/about",
    },
    {
      name: "Ayeta",
      image: "/ayeta.svg",
      url: "https://paradigmhq.org/programs/digital-rights/ayeta/",
    },
  ];
  resourceKits: SupportResource[] = [
    {
      name: "Data Detox Kit",
      image: "/ddk.png",
      url: "https://www.datadetoxkit.org",
    },
    {
      name: "Troll Tracker",
      image: "/troll-tracker.png",
      url: "https://trolltracker.investigate.africa/",
    },
    {
      name: "Guideline for Countering Online Abuse",
      image: "/oid.png",
      url: "https://openinternet.global/",
    },
  ];
  organisations: SupportResource[] = [
    {
      name: "Committee to Project Journalists",
      image: "/cpj.svg",
      url: "https://cpj.org/campaigns/safety-women-nonbinary-journalists-online-offline/"
    },
    {
      name: "Digital Defenders Partnership",
      image: "/ddp.png",
      url: "https://safetyofjournalistsinafrica.africa/"
    },
    {
      name: "Media Defence",
      image: "/media-defence.png",
      url: "https://mediadefence.org/"
    },
    {
      name: "She Persisted",
      image: "/she-persisted.png",
      url: "https://she-persisted.org"
    },
  ];
  tools: SupportResource[] = [
    {
      name: "Outline VPN",
      image: "/outline-vpn.png",
      url: "https://getoutline.org/",
    },
    {
      name: "Project Shield",
      image: "/project-shield.png",
      url: "https://support.projectshield.withgoogle.com",
    },
    {
      name: "Intra",
      image: "/intra.png",
      url: "https://getintra.org",
    },
    {
      name: "Tune",
      image: "/tune.png",
      url: "https://chrome.google.com/webstore/detail/tune-experimental/gdfknffdmmjakmlikbpdngpcpbbfhbnp",
    }
  ];

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
