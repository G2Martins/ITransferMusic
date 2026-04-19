package com.projeto.ITransferMusic.controller;

import com.projeto.ITransferMusic.model.User;
import com.projeto.ITransferMusic.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/login-success")
    @ResponseBody
    public String loginSuccess(OAuth2AuthenticationToken authentication) {
        String clientRegistrationId = authentication.getAuthorizedClientRegistrationId();
        OAuth2User oauthUser = authentication.getPrincipal();

        User user = new User();
        user.setEmail(oauthUser.getAttribute("email"));
        user.setNome(oauthUser.getAttribute("name"));

        // Correção: Obter IDs corretamente
        if ("spotify".equals(clientRegistrationId)) {
            user.setSpotifyId(oauthUser.getAttribute("id")); // ID correto do Spotify
        } else if ("google".equals(clientRegistrationId)) {
            user.setYoutubeId(oauthUser.getAttribute("sub")); // ID correto do Google
        }

        userRepository.save(user);
        return "Login bem-sucedido!";
    }
}
