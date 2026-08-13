package cn.immerseread.health;

import cn.immerseread.config.CredentialStore;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {
    private final CredentialStore credentialStore;

    public HealthController(CredentialStore credentialStore) {
        this.credentialStore = credentialStore;
    }

    @GetMapping("/health")
    Map<String, Object> health() {
        return Map.of("status", "ok", "llmConfigured", credentialStore.status().configured());
    }
}
