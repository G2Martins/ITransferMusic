import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';

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

const ACCESS_KEY = 'itm:access';
const REFRESH_KEY = 'itm:refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  readonly isAuthenticated = computed(() => !!this.accessToken());

  getAccessToken(): string | null {
    return this.accessToken();
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

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.accessToken.set(null);
  }

  private storeTokens(res: TokenResponse): void {
    localStorage.setItem(ACCESS_KEY, res.access_token);
    localStorage.setItem(REFRESH_KEY, res.refresh_token);
    this.accessToken.set(res.access_token);
  }
}
