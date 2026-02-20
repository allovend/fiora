import axios from 'axios';
import logger from '@fiora/utils/logger';

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LLMConfig {
    llmUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface LLMStreamChunk {
    content: string;
    done: boolean;
}

/**
 * LLM服务类
 * 封装与LLM API的交互
 */
class LLMService {
    /**
     * 调用LLM API进行对话
     * @param messages 对话消息列表
     * @param config LLM配置
     * @param onChunk 流式输出回调
     */
    async chat(
        messages: LLMMessage[],
        config: LLMConfig,
        onChunk?: (chunk: string) => void,
    ): Promise<string> {
        try {
            const { llmUrl, apiKey, model, temperature = 0.7, maxTokens = 2000, stream = !!onChunk } = config;

            const response = await axios.post(
                llmUrl,
                {
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    stream,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    responseType: stream ? 'stream' : 'json',
                },
            );

            if (stream && onChunk) {
                return await this.handleStreamResponse(response.data, onChunk);
            } else {
                return response.data.choices[0].message.content;
            }
        } catch (error) {
            const err = error as any;
            logger.error('[LLMService] Chat error:', err.message);
            throw new Error(`LLM调用失败: ${err.response?.data?.error?.message || err.message}`);
        }
    }

    /**
     * 处理流式响应
     * @param stream 响应流
     * @param onChunk 回调函数
     */
    private async handleStreamResponse(
        stream: any,
        onChunk: (chunk: string) => void,
    ): Promise<string> {
        let fullContent = '';

        return new Promise((resolve, reject) => {
            stream.on('data', (chunk: Buffer) => {
                const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        
                        if (data === '[DONE]') {
                            resolve(fullContent);
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            
                            if (content) {
                                fullContent += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            // 忽略JSON解析错误
                        }
                    }
                }
            });

            stream.on('end', () => {
                resolve(fullContent);
            });

            stream.on('error', (error: Error) => {
                logger.error('[LLMService] Stream error:', error);
                reject(error);
            });
        });
    }

    /**
     * 测试LLM连接
     * @param config LLM配置
     */
    async testConnection(config: LLMConfig): Promise<boolean> {
        try {
            const testMessages: LLMMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            await this.chat(testMessages, { ...config, stream: false });
            return true;
        } catch (error) {
            logger.error('[LLMService] Connection test failed:', error);
            return false;
        }
    }

    /**
     * 构建对话上下文
     * @param systemPrompt 系统提示词
     * @param history 历史消息
     * @param userMessage 用户消息
     * @param maxHistory 最大历史数
     */
    buildContext(
        systemPrompt: string,
        history: LLMMessage[],
        userMessage: string,
        maxHistory: number = 10,
    ): LLMMessage[] {
        const context: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
        ];

        // 只保留最近的N轮对话（user + assistant 成对）
        const recentHistory = history.slice(-maxHistory * 2);
        context.push(...recentHistory);

        // 添加当前用户消息
        context.push({ role: 'user', content: userMessage });

        return context;
    }

    /**
     * 解析思考标签
     * 将<think>内容</think>提取出来
     */
    parseThinkTags(content: string): { text: string; thinks: string[] } {
        const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
        const thinks: string[] = [];
        let match;

        while ((match = thinkRegex.exec(content)) !== null) {
            thinks.push(match[1].trim());
        }

        // 移除think标签，保留其他内容
        const text = content.replace(thinkRegex, '').trim();

        return { text, thinks };
    }
}

export default new LLMService();