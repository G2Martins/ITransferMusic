import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  Review,
  ReviewStats,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatApiError } from '../../core/utils/format-error';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reviews.component.html',
})
export class ReviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly reviews = signal<Review[]>([]);
  readonly stats = signal<ReviewStats | null>(null);
  readonly loading = signal(true);

  readonly hoverRating = signal<number>(0);
  readonly myRating = signal<number>(0);
  readonly myComment = signal<string>('');
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitSuccess = signal(false);
  readonly hasReviewed = signal(false);

  readonly stars = [1, 2, 3, 4, 5];
  readonly nps = computed(() => {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round((s.average / 5) * 100);
  });

  ngOnInit(): void {
    this.auth.hydrate();
    this.loadAll();
    if (this.auth.isAuthenticated()) {
      this.api.myReview().subscribe((r) => {
        if (r) {
          this.myRating.set(r.rating);
          this.myComment.set(r.comment ?? '');
          this.hasReviewed.set(true);
        }
      });
    }
  }

  private loadAll(): void {
    this.loading.set(true);
    this.api.listReviews().subscribe({
      next: (list) => {
        this.reviews.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.reviewStats().subscribe({
      next: (s) => this.stats.set(s),
    });
  }

  setRating(n: number): void {
    this.myRating.set(n);
  }

  setHover(n: number): void {
    this.hoverRating.set(n);
  }

  submit(): void {
    if (this.myRating() < 1) {
      this.submitError.set('Escolha uma classificação de 1 a 5 estrelas.');
      return;
    }
    this.submitError.set(null);
    this.submitting.set(true);
    this.api
      .submitReview({
        rating: this.myRating(),
        comment: this.myComment().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitSuccess.set(true);
          this.hasReviewed.set(true);
          this.loadAll();
          setTimeout(() => this.submitSuccess.set(false), 3000);
        },
        error: (err) => {
          this.submitting.set(false);
          this.submitError.set(formatApiError(err, 'Falha ao enviar avaliação'));
        },
      });
  }

  barWidth(rating: number): number {
    const s = this.stats();
    if (!s || s.total === 0) return 0;
    return Math.round(((s.distribution[rating] ?? 0) / s.total) * 100);
  }

  count(rating: number): number {
    return this.stats()?.distribution[rating] ?? 0;
  }
}
