package com.projeto.ITransferMusic.controller;

import com.projeto.ITransferMusic.service.PlaylistTransferService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    @Autowired
    private PlaylistTransferService playlistTransferService;

    @GetMapping("/from/{service}")
    public ResponseEntity<?> getUserPlaylists(
        @PathVariable String service,
        @RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient authorizedClient,
        @AuthenticationPrincipal OAuth2User oauthUser
    ) {
        try {
            String accessToken = authorizedClient.getAccessToken().getTokenValue();
            return ResponseEntity.ok(playlistTransferService.getSourceTracks(service, "playlistIdExemplo", accessToken));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro ao buscar playlists: " + e.getMessage());
        }
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transferPlaylist(
        @RequestParam String sourceService,
        @RequestParam String targetService,
        @RequestParam String playlistId,
        @RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient sourceClient,
        @RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient targetClient
    ) {
        try {
            String sourceToken = sourceClient.getAccessToken().getTokenValue();
            String targetToken = targetClient.getAccessToken().getTokenValue();
            
            String result = playlistTransferService.transferPlaylist(
                sourceService, 
                targetService, 
                playlistId, 
                sourceToken, 
                targetToken
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro na transferência: " + e.getMessage());
        }
    }
}
