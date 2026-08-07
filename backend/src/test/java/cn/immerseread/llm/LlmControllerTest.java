package cn.immerseread.llm;

import cn.immerseread.llm.dto.ChatRequest;
import cn.immerseread.llm.dto.ChatResponse;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LlmController.class)
class LlmControllerTest {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockitoBean
    LlmService llmService;

    @Test
    void chatRejectsOversizedContextWithPayloadTooLarge() throws Exception {
        ChatRequest request = new ChatRequest("book", "segment", "问题", "x".repeat(12001), 0, 12001, "low");

        mockMvc.perform(post("/api/llm/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isPayloadTooLarge())
            .andExpect(jsonPath("$.message", is("上下文长度不能超过 12000 个字符")));
    }

    @Test
    void chatReturnsServiceResponse() throws Exception {
        when(llmService.chat(any(ChatRequest.class))).thenReturn(new ChatResponse("可以，继续看这一段。", "test-model"));
        ChatRequest request = new ChatRequest("book", "segment", "这里发生了什么？", "正文", 0, 2, "low");

        mockMvc.perform(post("/api/llm/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content", is("可以，继续看这一段。")))
            .andExpect(jsonPath("$.modelName", is("test-model")));
    }

    @Test
    void chatRejectsInvalidRangeWithBadRequest() throws Exception {
        ChatRequest request = new ChatRequest("book", "segment", "问题", "正文", 5, 4, "low");

        mockMvc.perform(post("/api/llm/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message", is("上下文结束位置不能小于开始位置")));
    }
}
