import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="container mx-auto max-w-2xl px-6 py-16">
      <h1 class="text-4xl font-bold text-brand dark:text-white">{{ 'contact.title' | transloco }}</h1>
      <p class="mt-3 text-brand/70 dark:text-white/70">{{ 'contact.subtitle' | transloco }}</p>

      <form (ngSubmit)="submit()" class="mt-10 space-y-5">
        <input
          class="input-base"
          type="text"
          required
          [(ngModel)]="form.name"
          name="name"
          [attr.placeholder]="'contact.name' | transloco"
        />
        <input
          class="input-base"
          type="email"
          required
          [(ngModel)]="form.email"
          name="email"
          [attr.placeholder]="'contact.email' | transloco"
        />
        <textarea
          class="input-base min-h-[140px]"
          required
          [(ngModel)]="form.message"
          name="message"
          [attr.placeholder]="'contact.message' | transloco"
        ></textarea>
        <button type="submit" class="btn-primary w-full">
          <iconify-icon icon="ph:paper-plane-tilt-duotone" class="mr-2"></iconify-icon>
          {{ 'contact.submit' | transloco }}
        </button>

        @if (sent()) {
          <p class="text-sm font-medium text-green-600 dark:text-green-300">
            Mensagem registrada localmente (integração de e-mail virá depois).
          </p>
        }
      </form>
    </section>
  `,
})
export class ContactComponent {
  readonly sent = signal(false);
  form: ContactForm = { name: '', email: '', message: '' };

  submit(): void {
    // TODO: integrar com servico de email quando disponivel.
    this.sent.set(true);
    this.form = { name: '', email: '', message: '' };
  }
}
