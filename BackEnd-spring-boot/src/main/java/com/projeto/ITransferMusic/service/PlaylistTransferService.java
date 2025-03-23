package com.projeto.ITransferMusic.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.projeto.ITransferMusic.dto.TrackDTO;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PlaylistTransferService {
    
    @Autowired
    private SpotifyService spotifyService;
    
    @Autowired
    private YouTubeService youtubeService;

    public String transferPlaylist(String sourceService, String targetService, String playlistId, String sourceToken, String targetToken) {
        // 1. Obter músicas da origem
        List<TrackDTO> sourceTracks = getSourceTracks(sourceService, playlistId, sourceToken);
        
        // 2. Mapear para URIs do destino
        List<String> targetTrackIds = mapTracksToTarget(targetService, sourceTracks, targetToken);
        
        // 3. Criar playlist no destino
        return createTargetPlaylist(targetService, "Playlist Transferida", 
                                  "Transferida de " + sourceService, targetTrackIds, targetToken);
    }

    private List<TrackDTO> getSourceTracks(String service, String playlistId, String token) {
        return switch (service.toLowerCase()) {
            case "spotify" -> spotifyService.getPlaylistTracks(playlistId, token);
            case "youtube" -> youtubeService.getPlaylistTracks(playlistId, token);
            default -> throw new IllegalArgumentException("Serviço não suportado: " + service);
        };
    }

    private List<String> mapTracksToTarget(String targetService, List<TrackDTO> tracks, String token) {
        return tracks.stream()
            .map(track -> searchTrackOnTarget(targetService, track, token))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    private String searchTrackOnTarget(String targetService, TrackDTO track, String token) {
        String query = track.getName() + " " + track.getArtist();
        return switch (targetService.toLowerCase()) {
            case "spotify" -> spotifyService.searchTrack(query, token);
            case "youtube" -> youtubeService.searchTrack(query, token);
            default -> null;
        };
    }

    private String createTargetPlaylist(String targetService, String name, String description, List<String> trackIds, String token) {
        return switch (targetService.toLowerCase()) {
            case "spotify" -> spotifyService.createPlaylist("user-id", name, description, trackIds, token);
            case "youtube" -> youtubeService.createPlaylist(name, description, trackIds, token);
            default -> throw new IllegalArgumentException("Serviço não suportado: " + targetService);
        };
    }
}
