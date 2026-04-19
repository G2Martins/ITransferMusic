import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export type Provider = 'spotify' | 'youtube' | 'apple_music' | 'amazon_music' | 'deezer';

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  track_count: number | null;
  provider: Provider;
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string | null;
  uri: string;
  provider: Provider;
}

export interface LinkedAccount {
  provider: Provider;
  provider_display_name: string | null;
  provider_user_id: string | null;
}

export interface OAuthAuthorizeResponse {
  authorize_url: string;
  state: string;
}

export interface TransferResponse {
  id: string;
  source_provider: Provider;
  target_provider: Provider;
  source_playlist_id: string;
  target_playlist_id: string | null;
  target_playlist_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  total_tracks: number;
  matched_tracks: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferCreatePayload {
  source_provider: Provider;
  target_provider: Provider;
  source_playlist_id: string;
  target_playlist_name: string;
  target_playlist_description?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listLinkedAccounts() {
    return this.http.get<LinkedAccount[]>(`${this.base}/accounts`);
  }

  unlinkAccount(provider: Provider) {
    return this.http.delete<void>(`${this.base}/accounts/${provider}`);
  }

  oauthAuthorize(provider: Provider) {
    return this.http.get<OAuthAuthorizeResponse>(
      `${this.base}/auth/oauth/${provider}/authorize`,
    );
  }

  oauthCallback(provider: Provider, code: string, state: string) {
    return this.http.post<{ status: string; provider: string }>(
      `${this.base}/auth/oauth/${provider}/callback`,
      { code, state },
    );
  }

  listPlaylists(provider: Provider) {
    return this.http.get<PlaylistSummary[]>(`${this.base}/playlists/${provider}`);
  }

  getPlaylistTracks(provider: Provider, playlistId: string) {
    return this.http.get<Track[]>(
      `${this.base}/playlists/${provider}/${playlistId}/tracks`,
    );
  }

  createTransfer(payload: TransferCreatePayload) {
    return this.http.post<TransferResponse>(`${this.base}/transfers`, payload);
  }

  getTransfer(id: string) {
    return this.http.get<TransferResponse>(`${this.base}/transfers/${id}`);
  }

  listTransfers() {
    return this.http.get<TransferResponse[]>(`${this.base}/transfers`);
  }
}
