package cn.immerseread.health;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthControllerTest {
    @LocalServerPort
    int port;

    @Test
    void healthReportsServiceStatus() {
        ResponseEntity<Map> response = RestClient.create("http://localhost:" + port)
            .get()
            .uri("/api/health")
            .retrieve()
            .toEntity(Map.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("status", "ok");
    }
}
