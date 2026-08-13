package cn.immerseread.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EnvironmentCredentialStoreTest {
    @Test
    void configuredStoreDoesNotExposeRawKeyInStatus() {
        EnvironmentCredentialStore store = new EnvironmentCredentialStore("sk-test-secret");

        CredentialStatus status = store.status();

        assertThat(status.configured()).isTrue();
        assertThat(status.toString()).doesNotContain("sk-test-secret");
        assertThat(status.message()).doesNotContain("sk-test-secret");
    }

    @Test
    void blankStoreReportsUnconfigured() {
        EnvironmentCredentialStore store = new EnvironmentCredentialStore("   ");

        assertThat(store.resolveApiKey()).isEmpty();
        assertThat(store.status().configured()).isFalse();
    }

    @Test
    void propertiesUseGenericLlmSettingsBeforeLegacyOpenAiSettings() {
        LlmProperties properties = new LlmProperties();
        properties.setProvider("deepseek");
        properties.setApiKey("generic-key");
        properties.setApiUrl("https://api.deepseek.com");
        properties.setModelName("deepseek-v4-flash");

        assertThat(properties.getProvider()).isEqualTo("deepseek");
        assertThat(properties.getApiKey()).isEqualTo("generic-key");
        assertThat(properties.getApiUrl()).isEqualTo("https://api.deepseek.com");
        assertThat(properties.getModelName()).isEqualTo("deepseek-v4-flash");
    }
}
