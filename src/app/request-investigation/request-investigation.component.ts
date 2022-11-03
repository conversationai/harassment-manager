import { Component, OnInit } from '@angular/core';

interface TeamMember {
  name: string;
  title: string;
  image: string;
}

@Component({
  selector: 'app-request-investigation',
  templateUrl: './request-investigation.component.html',
  styleUrls: ['./request-investigation.component.scss']
})
export class RequestInvestigationComponent {

  teamMembers: TeamMember[] = [
    {
      name: 'Allan Cheboi',
      title: 'Senior Investigations Manager',
      image: '/allan-cheboi.svg'
    },
    {
      name: 'Peter Kimani',
      title: 'Senior Investigative Data Analyst',
      image: '/peter-kimani.svg'
    },
    {
      name: 'Lujain Alsedeg',
      title: 'Senior Investigative Researcher',
      image: '/lujain-alsedeg.svg'
    },
    {
      name: 'Leon Vambe',
      title: 'Investigative Data Analyst',
      image: '/leon-vambe.svg'
    },
    {
      name: 'Hanna Teshager',
      title: 'Investigative Data Analyst',
      image: '/hanna-teshager.svg'
    },
    {
      name: 'Ivan Musebe',
      title: 'Investigative Data Analyst',
      image: '/ivan-musebe.svg'
    },
    {
      name: 'Anita Igbine',
      title: 'Investigative Data Analyst',
      image: '/anita-igbine.svg'
    }

  ];

}
