package cn.immerseread.llm;

import cn.immerseread.llm.dto.AtmosphereRequest;
import cn.immerseread.llm.dto.AtmosphereResponse;
import cn.immerseread.llm.dto.ChatRequest;
import cn.immerseread.llm.dto.ChatResponse;
import cn.immerseread.llm.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/llm")
public class LlmController {
    private static final Logger log = LoggerFactory.getLogger(LlmController.class);
    private static final int MAX_CONTEXT_LENGTH = 12000;

    private final LlmService llmService;

    public LlmController(LlmService llmService) {
        this.llmService = llmService;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody ChatRequest request) {
        ResponseEntity<ErrorResponse> invalid = validateChat(request);
        if (invalid != null) {
            return invalid;
        }
        log.info(
            "LLM chat request bookId={} segmentId={} range={}..{} spoilerRisk={}",
            request.bookId(),
            request.segmentId(),
            request.contextStartChar(),
            request.contextEndChar(),
            request.spoilerRisk()
        );
        ChatResponse response = llmService.chat(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/atmosphere")
    public ResponseEntity<?> atmosphere(@RequestBody AtmosphereRequest request) {
        ResponseEntity<ErrorResponse> invalid = validateAtmosphere(request);
        if (invalid != null) {
            return invalid;
        }
        log.info("LLM atmosphere request segmentId={} textLength={}", request.segmentId(), request.text().length());
        AtmosphereResponse response = llmService.analyzeAtmosphere(request);
        return ResponseEntity.ok(response);
    }

    private static ResponseEntity<ErrorResponse> validateChat(ChatRequest request) {
        if (request == null) {
            return badRequest("请求不能为空");
        }
        if (request.question() == null || request.question().isBlank()) {
            return badRequest("问题不能为空");
        }
        if (request.allowedContext() == null) {
            return badRequest("上下文不能为空");
        }
        if (request.allowedContext().length() > MAX_CONTEXT_LENGTH) {
            return payloadTooLarge("上下文长度不能超过 12000 个字符");
        }
        if (request.contextStartChar() < 0) {
            return badRequest("上下文开始位置不能小于 0");
        }
        if (request.contextEndChar() < request.contextStartChar()) {
            return badRequest("上下文结束位置不能小于开始位置");
        }
        return null;
    }

    private static ResponseEntity<ErrorResponse> validateAtmosphere(AtmosphereRequest request) {
        if (request == null) {
            return badRequest("请求不能为空");
        }
        if (request.segmentId() == null || request.segmentId().isBlank()) {
            return badRequest("片段 ID 不能为空");
        }
        if (request.text() == null || request.text().isBlank()) {
            return badRequest("文本不能为空");
        }
        if (request.text().length() > MAX_CONTEXT_LENGTH) {
            return payloadTooLarge("文本长度不能超过 12000 个字符");
        }
        return null;
    }

    private static ResponseEntity<ErrorResponse> badRequest(String message) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
    }

    private static ResponseEntity<ErrorResponse> payloadTooLarge(String message) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ErrorResponse(message));
    }
}
