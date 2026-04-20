import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
}

export interface UpdateProfilePayload {
  name: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

const ACCESS_KEY = 'itm:access';
const REFRESH_KEY = 'itm:refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  readonly isAuthenticated = computed(() => !!this.accessToken());

  readonly currentUser = signal<MeResponse | null>(null);
  readonly firstName = computed(() => {
    const name = this.currentUser()?.name ?? '';
    return name.trim().split(/\s+/)[0] ?? '';
  });

  getAccessToken(): string | null {
    return this.accessToken();
  }

  /** Carrega o usuario atual se houver token e cache ainda vazio. */
  hydrate(): void {
    if (this.isAuthenticated() && !this.currentUser()) {
      this.getMe().subscribe({
        next: (me) => this.currentUser.set(me),
        error: () => this.currentUser.set(null),
      });
    }
  }

  login(payload: LoginPayload): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.base}/login`, payload)
      .pipe(tap((res) => this.storeTokens(res)));
  }

  register(payload: RegisterPayload): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.base}/register`, payload)
      .pipe(tap((res) => this.storeTokens(res)));
  }

  refresh(): Observable<TokenResponse> {
    const refresh_token = localStorage.getItem(REFRESH_KEY);
    return this.http
      .post<TokenResponse>(`${this.base}/refresh`, { refresh_token })
      .pipe(tap((res) => this.storeTokens(res)));
  }

  googleLogin(credential: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.base}/google/login`, { credential })
      .pipe(tap((res) => this.storeTokens(res)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.accessToken.set(null);
    this.currentUser.set(null);
  }

  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/me`);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<MeResponse> {
    return this.http.patch<MeResponse>(`${this.base}/me`, payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.base}/change-password`, payload);
  }

  private storeTokens(res: TokenResponse): void {
    localStorage.setItem(ACCESS_KEY, res.access_token);
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    this.accessToken.set(res.access_token);
    this.hydrate();
  }
}
