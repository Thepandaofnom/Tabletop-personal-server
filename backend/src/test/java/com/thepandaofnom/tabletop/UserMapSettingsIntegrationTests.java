package com.thepandaofnom.tabletop;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UserMapSettingsIntegrationTests {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserMapSettingsRepository userMapSettingsRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userMapSettingsRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void listsSavedMapMetadataWithoutReturningTheLargeMapPayload() throws Exception {
        User user = new User();
        user.setUid("map-user");
        user.setUsername("map-user");
        user.setPassword(new BCryptPasswordEncoder().encode("password"));
        user.setCreatedAt(LocalDateTime.now());
        user = userRepository.saveAndFlush(user);

        MockHttpSession session = login("map-user");
        String settingsJson = "{\"mapImage\":\"" + "A".repeat(1_000_000) + "\"}";

        mockMvc.perform(post("/api/map-settings/user/{userId}", user.getId())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"saveName":"large-map","settingsJson":%s}
                                """.formatted(toJsonString(settingsJson))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/map-settings/user/{userId}", user.getId()).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].saveName").value("large-map"))
                .andExpect(jsonPath("$[0].settingsJson").doesNotExist());

        mockMvc.perform(get("/api/map-settings/user/{userId}/{saveName}", user.getId(), "large-map")
                        .session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settingsJson").value(settingsJson));
    }

    private MockHttpSession login(String username) throws Exception {
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"password"}
                                """.formatted(username)))
                .andExpect(status().isOk())
                .andReturn();

        return (MockHttpSession) login.getRequest().getSession(false);
    }

    private String toJsonString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
