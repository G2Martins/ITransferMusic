package com.projeto.ITransferMusic.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.projeto.ITransferMusic.dto.TrackDTO;
import com.projeto.ITransferMusic.utils.CastUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class YouTubeService {

    private final RestTemplate restTemplate;
    private final String API_BASE = "https://www.googleapis.com/youtube/v3";

    public YouTubeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ================ MÉTODOS PRINCIPAIS ================ //

    public List<TrackDTO> getPlaylistTracks(String playlistId, String accessToken) {
        String url = API_BASE + "/playlistItems?part=snippet&playlistId=" + playlistId + "&maxResults=50";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractTracks(response);
    }

    public String searchTrack(String query, String accessToken) {
        String encodedQuery = query.replace(" ", "%20");
        String url = API_BASE + "/search?part=snippet&q=" + encodedQuery + "&type=video&maxResults=1";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractVideoId(response);
    }

    public String createPlaylist(String name, String description, List<String> videoIds, String accessToken) {
        String url = API_BASE + "/playlists?part=snippet,status";
        Map<String, Object> body = buildPlaylistBody(name, description);
        Map<String, Object> response = postToAPI(url, accessToken, body);
        @SuppressWarnings("unchecked")
        String playlistId = (String) ((Map<String, Object>) response.get("id")).get("playlistId");
        
        if (playlistId != null && !videoIds.isEmpty()) {
            addVideosToPlaylist(playlistId, videoIds, accessToken);
        }
        
        return playlistId;
    }

    // ================ MÉTODOS AUXILIARES ================ //

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchFromAPI(String url, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class).getBody();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postToAPI(String url, String accessToken, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class).getBody();
    }

    @SuppressWarnings("unchecked")
    private List<TrackDTO> extractTracks(Map<String, Object> response) {
        
        List<Map<String, Object>> items = CastUtils.<Map<String, Object>>safeCastToList(
                response.get("items"), 
                (Class<Map<String, Object>>) (Class<?>) Map.class
        );
        return items.stream().map(item -> {
            Map<String, Object> snippet = CastUtils.safeCast(item.get("snippet"), Map.class);
            Map<String, Object> resource = CastUtils.safeCast(snippet.get("resourceId"), Map.class);
            
            String videoId = (String) resource.get("videoId");
            String title = (String) snippet.get("title");
            String channel = (String) snippet.get("channelTitle");
    
            return new TrackDTO(videoId, title, channel, "youtube:video:" + videoId);
        }).collect(Collectors.toList());
    }
    
    @SuppressWarnings("unchecked")
    private String extractVideoId(Map<String, Object> response) {
        List<Map<String, Object>> items = CastUtils.<Map<String, Object>>safeCastToList(
                response.get("items"), 
                (Class<Map<String, Object>>) (Class<?>) Map.class
        );
        if (items.isEmpty()) return null;
        
        Map<String, Object> idMap = CastUtils.safeCast(items.get(0).get("id"), Map.class);
        return (String) idMap.get("videoId");
    }

    private Map<String, Object> buildPlaylistBody(String name, String description) {
        Map<String, Object> snippet = new HashMap<>();
        snippet.put("title", name);
        snippet.put("description", description);

        Map<String, Object> status = new HashMap<>();
        status.put("privacyStatus", "private");

        Map<String, Object> body = new HashMap<>();
        body.put("snippet", snippet);
        body.put("status", status);
        
        return body;
    }

    private void addVideosToPlaylist(String playlistId, List<String> videoIds, String accessToken) {
        String url = API_BASE + "/playlistItems?part=snippet";
        videoIds.forEach(videoId -> {
            Map<String, Object> snippet = new HashMap<>();
            snippet.put("playlistId", playlistId);
            
            Map<String, Object> resourceId = new HashMap<>();
            resourceId.put("kind", "youtube#video");
            resourceId.put("videoId", videoId);
            
            snippet.put("resourceId", resourceId);

            Map<String, Object> body = new HashMap<>();
            body.put("snippet", snippet);
            
            postToAPI(url, accessToken, body);
        });
    }
}