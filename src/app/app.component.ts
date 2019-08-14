import { Component } from '@angular/core';

import { FileService } from './file.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  message: string;

  constructor(private fileService: FileService) { }

  getBooks() {
    this.fileService.getFiles().then(x => console.log(x));
  }
}
