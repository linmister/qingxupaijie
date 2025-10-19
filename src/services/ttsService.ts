/**
 * 火山引擎TTS语音合成服务
 * 支持流式和非流式语音合成
 */

// TTS配置接口
export interface TTSConfig {
  appId: string;
  accessKey: string;
  apiUrl: string;
  resourceId: string;
}

// 音频参数接口
export interface AudioParams {
  format?: 'mp3' | 'ogg_opus' | 'pcm' | 'wav';
  sampleRate?: number;
  bitRate?: number;
  emotion?: string;
  emotionScale?: number;
  speechRate?: number;
  loudnessRate?: number;
  enableTimestamp?: boolean;
}

// TTS请求参数接口
export interface TTSRequest {
  text: string;
  speaker: string;
  audioParams?: AudioParams;
  user?: {
    uid: string;
  };
}

// TTS响应接口
export interface TTSResponse {
  success: boolean;
  data?: {
    audio: string; // base64编码的音频数据
    timestamp?: number;
  };
  error?: string;
}

// 语音模式配置
export interface VoiceModeConfig {
  speaker: string;
  emotion?: string;
  emotionScale?: number;
  speechRate?: number;
  loudnessRate?: number;
}

/**
 * 不同情感模式的语音配置
 * 根据模式特点选择合适的音色和情感参数
 */
export const VOICE_MODE_CONFIGS: Record<string, VoiceModeConfig> = {
  // 受气包模式：温和、耐心的男声
  '受气包': {
    speaker: 'zh_male_beijingxiaoye_emo_v2_mars_bigtts', // 北京小爷情感男声，适合温和场景
    emotion: 'neutral',           // 改为中性情绪，可能更兼容
    emotionScale: 1,              // 降低情绪强度
    speechRate: 0,                // 正常语速
    loudnessRate: 0,              // 正常音量
  },
  
  // 抬杠模式：略带调侃的中性声音
  '抬杠': {
    speaker: 'zh_male_fanjuanqingnian_mars_bigtts',   // 反卷青年男声，适合抬杠场景
    emotion: 'neutral',           // 中性情绪
    emotionScale: 1,              // 较低情绪强度
    speechRate: 10,               // 稍快语速，增加节奏感
    loudnessRate: 0,              // 正常音量
  },
  
  // 互相伤害模式：略带调侃的中性声音（保持兼容性）
  '互相伤害': {
    speaker: 'zh_male_fanjuanqingnian_mars_bigtts',   // 反卷青年男声，适合抬杠场景
    emotion: 'neutral',           // 中性情绪
    emotionScale: 1,              // 较低情绪强度
    speechRate: 10,               // 稍快语速，增加节奏感
    loudnessRate: 0,              // 正常音量
  },
  
  // 心理疗愈模式：温暖、治愈的声音
  '心理疗愈': {
    speaker: 'ICL_zh_female_zhixingwenwan_tob',  // 知性温婉女声，适合治愈场景
    emotion: 'gentle',            // 温柔情绪
    emotionScale: 3,              // 较高情绪强度
    speechRate: 10,               // 稍快语速（整数值）
    loudnessRate: -5,             // 稍小音量，更温和
  },
};

/**
 * TTS服务类
 * 封装火山引擎语音合成API调用
 */
class TTSService {
  private config: TTSConfig;
  private retryCount = 3;        // 重试次数
  private retryDelay = 1000;     // 重试延迟（毫秒）
  private requestTimeout = 30000; // 请求超时时间（毫秒）

  constructor() {
    this.config = {
      appId: import.meta.env.VITE_TTS_APP_ID || '',
      accessKey: import.meta.env.VITE_TTS_ACCESS_KEY || '',
      apiUrl: import.meta.env.VITE_TTS_API_URL || 'https://openspeech.bytedance.com/api/v1/tts',
      resourceId: import.meta.env.VITE_TTS_RESOURCE_ID || 'volc.tts.zh_cn',
    };
  }

  /**
   * 检查TTS服务配置是否完整
   */
  isConfigured(): boolean {
    return !!(this.config.appId && this.config.accessKey && this.config.apiUrl);
  }

  /**
   * 获取配置状态信息
   */
  getConfigStatus() {
    return {
      hasAppId: !!this.config.appId,
      hasAccessKey: !!this.config.accessKey,
      hasApiUrl: !!this.config.apiUrl,
      resourceId: this.config.resourceId,
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试的HTTP请求
   */
  private async requestWithRetry(
    url: string, 
    options: RequestInit, 
    attempt: number = 1
  ): Promise<Response> {
    try {
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // 检查HTTP状态码
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`TTS请求失败 (尝试 ${attempt}/${this.retryCount}):`, error);
      
      // 如果还有重试次数且不是配置错误
      if (attempt < this.retryCount && !this.isConfigurationError(error)) {
        console.log(`${this.retryDelay}ms后重试...`);
        await this.delay(this.retryDelay);
        return this.requestWithRetry(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * 判断是否为配置错误（不应重试的错误）
   */
  private isConfigurationError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('401') ||      // 认证失败
      errorMessage.includes('403') ||      // 权限不足
      errorMessage.includes('invalid') ||  // 无效参数
      errorMessage.includes('unauthorized')
    );
  }

  /**
   * 处理API响应错误
   */
  private handleApiError(error: any): string {
    if (error?.name === 'AbortError') {
      return '请求超时，请检查网络连接';
    }
    
    const errorMessage = error?.message || '';
    
    if (errorMessage.includes('401')) {
      return 'API认证失败，请检查访问密钥配置';
    }
    
    if (errorMessage.includes('403')) {
      return 'API权限不足，请检查账户权限';
    }
    
    if (errorMessage.includes('429')) {
      return 'API调用频率过高，请稍后再试';
    }
    
    if (errorMessage.includes('500')) {
      return '服务器内部错误，请稍后再试';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return '网络连接失败，请检查网络设置';
    }
    
    return errorMessage || '语音合成服务暂时不可用';
  }

  /**
   * 检查配置是否完整
   */
  private validateConfig(): boolean {
    return !!(this.config.appId && this.config.accessKey);
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Api-App-Key': this.config.appId,
      'X-Api-Access-Key': this.config.accessKey,
      'X-Api-Resource-Id': this.config.resourceId,
      'X-Api-Request-Id': this.generateRequestId(),
    };
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: TTSRequest): any {
    const defaultAudioParams: AudioParams = {
      format: 'mp3',
      sampleRate: 24000,
      bitRate: 64000,
      speechRate: 0,
      loudnessRate: 0,
      enableTimestamp: false,
    };

    const audioParams = { ...defaultAudioParams, ...request.audioParams };

    return {
      user: request.user || { uid: 'default_user' },
      namespace: 'BidirectionalTTS',
      req_params: {
        text: request.text,
        speaker: request.speaker,
        audio_params: {
          format: audioParams.format,
          sample_rate: audioParams.sampleRate,
          bit_rate: audioParams.bitRate,
          emotion: audioParams.emotion,
          emotion_scale: audioParams.emotionScale,
          speech_rate: audioParams.speechRate,
          loudness_rate: audioParams.loudnessRate,
          enable_timestamp: audioParams.enableTimestamp,
        },
      },
    };
  }

  /**
   * 非流式语音合成
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    if (!this.validateConfig()) {
      return {
        success: false,
        error: 'TTS配置不完整，请检查环境变量中的APP_ID和ACCESS_KEY',
      };
    }

    // 检查文本长度
    if (!request.text || request.text.trim().length === 0) {
      return {
        success: false,
        error: '文本内容不能为空',
      };
    }

    if (request.text.length > 1000) {
      return {
        success: false,
        error: '文本长度不能超过1000个字符',
      };
    }

    try {
      const headers = this.buildHeaders();
      const body = this.buildRequestBody(request);

      console.log('TTS请求参数:', {
        url: this.config.apiUrl,
        text: request.text.substring(0, 50) + (request.text.length > 50 ? '...' : ''),
        speaker: request.speaker,
        audioParams: request.audioParams,
        headers: headers,
        body: body
      });

      const response = await this.requestWithRetry(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API响应错误:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      // 获取响应文本并检查是否为有效JSON
      const responseText = await response.text();
      console.log('TTS API完整响应:', responseText);
      console.log('响应长度:', responseText.length);
      console.log('响应前100字符:', responseText.substring(0, 100));
      
      // 检查响应是否为空
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('API返回空响应');
      }

      // 处理多行JSON响应格式
      const lines = responseText.trim().split('\n').filter(line => line.trim());
      console.log('响应行数:', lines.length);
      
      // 解析每一行JSON并收集音频数据
      const audioDataParts: string[] = [];
      let finalResult = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        console.log(`处理第${i + 1}行:`, line.substring(0, 100) + (line.length > 100 ? '...' : ''));
        
        try {
           const lineResult = JSON.parse(line);
           
           // 检查响应状态 - 支持多种成功状态码
           if (lineResult.code !== 0 && lineResult.code !== 20000000) {
             console.warn(`第${i + 1}行状态码异常: ${lineResult.code}, 消息: ${lineResult.message}`);
             // 如果不是严重错误，继续处理
             if (lineResult.code < 0) {
               throw new Error(`API返回错误: ${lineResult.message || '未知错误'} (状态码: ${lineResult.code})`);
             }
           }
           
           // 如果有音频数据，收集起来
           if (lineResult.data && typeof lineResult.data === 'string' && lineResult.data.length > 0) {
             audioDataParts.push(lineResult.data);
             console.log(`收集到第${i + 1}行音频数据，长度:`, lineResult.data.length);
           }
           
           // 记录状态码信息
           console.log(`第${i + 1}行状态码: ${lineResult.code}, 消息: "${lineResult.message}"`);
           
           // 保存最后一个有效的结果结构
           finalResult = lineResult;
          
        } catch (parseError: unknown) {
          console.error(`第${i + 1}行JSON解析错误:`, parseError);
          console.error(`第${i + 1}行内容:`, line);
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          throw new Error(`第${i + 1}行JSON解析失败: ${errorMessage}`);
        }
      }
      
      // 如果没有收集到任何音频数据，使用原始逻辑处理单行响应
      if (audioDataParts.length === 0) {
        console.log('未检测到多行音频数据，尝试单行JSON解析');
        try {
          const result = JSON.parse(responseText.trim());
          // 支持多种成功状态码
          if (result.code !== 0 && result.code !== 20000000) {
            throw new Error(`API返回错误: ${result.message || '未知错误'} (状态码: ${result.code})`);
          }
          
          // 检查data是否为null或空
          if (!result.data) {
            console.error('API返回成功但音频数据为空:', result);
            throw new Error('TTS合成失败：API返回的音频数据为空，可能是音色不支持或参数配置问题');
          }
          
          return {
            success: true,
            data: {
              audio: result.data,
              timestamp: Date.now(),
            },
          };
        } catch (parseError: unknown) {
          console.error('单行JSON解析也失败:', parseError);
          console.error('原始响应内容:', responseText);
          console.error('响应内容长度:', responseText.length);
          console.error('响应前200字符:', responseText.substring(0, 200));
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          throw new Error(`API返回的不是有效的JSON格式: ${errorMessage}`);
        }
      }
      
      // 合并所有音频数据
      const combinedAudioData = audioDataParts.join('');
      console.log('合并后的音频数据总长度:', combinedAudioData.length);
      
      // 构造最终结果，使用合并后的音频数据
      const result = {
        ...finalResult,
        data: combinedAudioData
      };
      
      // 检查最终结果状态 - 支持多种成功状态码
      if (result.code && result.code !== 0 && result.code !== 20000000) {
        // 只有非成功状态码才抛出错误
        throw new Error(result.message || '语音合成失败');
      }

      // 处理响应数据 - 直接使用合并后的音频数据
      if (combinedAudioData && combinedAudioData.length > 0) {
        console.log('TTS合成成功，音频数据长度:', combinedAudioData.length);
        return {
          success: true,
          data: {
            audio: combinedAudioData,
            timestamp: Date.now(),
          },
        };
      } else {
        throw new Error('API返回的音频数据为空');
      }
    } catch (error) {
      console.error('TTS合成错误:', error);
      
      const errorMessage = this.handleApiError(error);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 根据情感模式获取语音配置
   */
  getVoiceConfigByMode(mode: string): VoiceModeConfig {
    return VOICE_MODE_CONFIGS[mode] || VOICE_MODE_CONFIGS['心理疗愈'];
  }

  /**
   * 根据情感模式合成语音
   */
  async synthesizeByMode(text: string, mode: string): Promise<TTSResponse> {
    const voiceConfig = this.getVoiceConfigByMode(mode);
    
    const request: TTSRequest = {
      text,
      speaker: voiceConfig.speaker,
      audioParams: {
        format: 'mp3',
        sampleRate: 24000,
        emotion: voiceConfig.emotion,
        emotionScale: voiceConfig.emotionScale,
        speechRate: voiceConfig.speechRate,
        loudnessRate: voiceConfig.loudnessRate,
        enableTimestamp: false,
      },
    };

    return this.synthesize(request);
  }

  /**
   * 流式语音合成（预留接口）
   */
  async synthesizeStream(
    request: TTSRequest,
    _onChunk: (chunk: string) => void
  ): Promise<TTSResponse> {
    // 流式合成的实现会更复杂，需要处理Server-Sent Events或WebSocket
    // 这里先提供基础框架
    console.log('流式合成功能待实现');
    return this.synthesize(request);
  }
}

// 导出单例实例
export const ttsService = new TTSService();
export default ttsService;