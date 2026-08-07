package cn.immerseread.credentials;

import cn.immerseread.config.CredentialStatus;
import cn.immerseread.config.CredentialStore;
import java.util.Arrays;

public class CredentialsCommand {
    private final CredentialStore credentialStore;

    public CredentialsCommand(CredentialStore credentialStore) {
        this.credentialStore = credentialStore;
    }

    public String run(String... args) {
        if (args == null || args.length < 2 || !"credentials".equals(args[0])) {
            return "用法：credentials <set|status|clear>";
        }
        return switch (args[1]) {
            case "status" -> status();
            case "set" -> set(args);
            case "clear" -> clear();
            default -> "用法：credentials <set|status|clear>";
        };
    }

    private String status() {
        CredentialStatus status = credentialStore.status();
        return "凭据状态：" + status.message() + "（来源：" + status.source() + "）";
    }

    private String set(String[] args) {
        if (args.length < 3 || args[2].isBlank()) {
            return "请提供 API key";
        }
        char[] key = args[2].toCharArray();
        try {
            credentialStore.set(key);
            return "凭据已保存";
        } finally {
            Arrays.fill(key, '\0');
        }
    }

    private String clear() {
        credentialStore.clear();
        return "凭据已清除";
    }
}
