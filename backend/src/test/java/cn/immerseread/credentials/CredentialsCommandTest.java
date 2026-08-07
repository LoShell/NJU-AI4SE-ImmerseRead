package cn.immerseread.credentials;

import cn.immerseread.config.CredentialStatus;
import cn.immerseread.config.CredentialStore;
import java.util.Optional;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CredentialsCommandTest {
    @Test
    void statusNeverPrintsRawKey() {
        CredentialStore store = new CredentialStore() {
            @Override
            public Optional<String> resolveApiKey() {
                return Optional.of("sk-visible-secret");
            }

            @Override
            public CredentialStatus status() {
                return new CredentialStatus(true, "test", "已配置");
            }

            @Override
            public void set(char[] key) {
                throw new UnsupportedOperationException("not used");
            }

            @Override
            public void clear() {
                throw new UnsupportedOperationException("not used");
            }
        };
        CredentialsCommand command = new CredentialsCommand(store);

        String output = command.run("credentials", "status");

        assertThat(output).contains("已配置");
        assertThat(output).doesNotContain("sk-visible-secret");
    }
}
