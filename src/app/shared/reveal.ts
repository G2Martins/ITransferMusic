import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

// One-shot reveal-on-scroll. Hidden state lives in CSS under `.js` (see styles.css), so prerendered
// HTML stays fully visible to crawlers and no-JS clients. One shared observer for the whole page.
let io: IntersectionObserver | undefined;

@Directive({ selector: '[reveal]', host: { 'data-reveal': '' } })
export class Reveal {
  /** Delay in ms, applied only to the entrance transition. */
  reveal = input<number | string>('');
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      document.documentElement.classList.add('reveal-ready');
      if (!('IntersectionObserver' in window)) return node.classList.add('in');
      const delay = Number(this.reveal());
      if (delay) node.style.transitionDelay = `${delay}ms`;
      io ??= new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add('in');
            io!.unobserve(e.target);
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      io.observe(node);
    });
    inject(DestroyRef).onDestroy(() => io?.unobserve(this.el.nativeElement));
  }
}
