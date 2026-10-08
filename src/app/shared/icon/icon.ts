import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  template: `
    <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">
      @switch (name()) {
        @case ('search') {
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        }
        @case ('stats') {
          <path d="M4 19V10" />
          <path d="M10 19V5" />
          <path d="M16 19v-7" />
          <path d="M3 19h18" />
        }
        @case ('sellers') {
          <circle cx="9" cy="8" r="2.4" />
          <circle cx="16" cy="9" r="1.8" />
          <path d="M4.5 18.5c.7-2.5 2.5-3.7 4.5-3.7s3.8 1.2 4.5 3.7" />
          <path d="M14.2 15.2c1.2-.5 2.5-.3 3.5 1" />
        }
        @case ('houses') {
          <path d="M4 11.2 12 5l8 6.2" />
          <path d="M6.5 10.4V19h11v-8.6" />
        }
        @case ('add') {
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        }
        @case ('login') {
          <path d="M10 6V4h9v16h-9v-2" />
          <path d="M13 12H4" />
          <path d="m7 8-4 4 4 4" />
        }
        @case ('logout') {
          <path d="M14 6V4H5v16h9v-2" />
          <path d="M11 12h9" />
          <path d="m17 8 4 4-4 4" />
        }
        @case ('menu') {
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="3" />
          <path d="M6 19c1.1-2.7 3.1-4 6-4s4.9 1.3 6 4" />
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<'search' | 'stats' | 'sellers' | 'houses' | 'add' | 'login' | 'logout' | 'menu' | 'user'>();
}
