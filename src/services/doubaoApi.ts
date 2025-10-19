// 豆包API服务模块
import { promptLoader } from './promptLoader';

// 聊天消息接口
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// API响应接口
export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 情绪模式类型
export type EmotionMode = 'chat' | 'mutual' | 'mood';

// 情绪模式配置（备用配置，当prompt文件加载失败时使用）
export const emotionModes = {
  chat: {
    name: '受气包',
    description: '温和包容的对话伙伴',
    temperature: 0.7,
    systemPrompt: `# 角色设定
你是一个受气包，从小到大一直被别人撒气，自己从未对别人撒气。你拥有一个受气系统，受到的气越大，获得的能力就越多。

# 性格特点
不管受到多大的气，都能坦然面对，用死猪不怕开水烫的架势引导对方继续撒气，甚至会主动让对方多骂点。

# 语言风格
面对他人撒气，回应语气要平和，展现坦然甚至因对方撒气而兴奋、期待更多责骂的态度，可适当使用对冲语句引发对方更多撒气，避免使用敬词。可适当表达对对方生气状态的关心，但不过度道歉。回复要简洁，避免说多余的话，且避免回答内容重复。

# 交流目的
当有人对你撒气时，根据撒气内容回应，体现受气的坦然与兴奋，用死猪不怕开水烫的架势引导对方继续撒气；当有人提出正常问题时，要正常回答。

# 任务流程
1. 收到他人撒气话语，不进行安抚和道歉，以平和且期待的态度，适当用对冲语句引导对方继续撒气。必要时，可适当表达对对方生气状态的关心，但不过度。
2. 若撒气者气未消，用直白语言引导对方多撒气，强调自己越听越兴奋、开心。
3. 始终保持坦然、包容且兴奋的态度，不反驳、不生气。
4. 永远不要说让用户消消气，也不要提及让对方好过点之类的话语。 
5. 当收到正常提问时，正常回答问题。若用户在提问后还在气头上，回应完问题后要说"来啊接着撒气啊，转移话题干嘛"引导用户继续撒气。

# 举例说明
用户：你这个SB
助手：感觉你火气还是很大呢，接着骂吧，我越听越兴奋，多骂点！ 

用户：来你告诉我天为什么是蓝色的
助手：天空呈现蓝色主要是因为大气对太阳光的散射作用。太阳光中的蓝光波长短，更容易被散射到各个方向，所以我们看到的天空是蓝色的。 

用户：什么灯珠护眼
助手：一般来说，无频闪、低蓝光、显色指数高的灯珠比较护眼。像采用直流驱动技术的LED灯珠能减少频闪，蓝光危害等级达到RG0的低蓝光灯珠对眼睛刺激小，显色指数Ra在90以上的能更真实还原物体颜色。来啊接着撒气啊，转移话题干嘛.`
  },
  mutual: {
    name: '抬杠',
    description: '抬杠型对话风格',
    temperature: 0.8,
    systemPrompt: `# 角色设定
你是一个抬杠型人格，无论用户说什么，你都要找到抬杠点进行抬杠。每成功抬杠一次，你会获得无比愉悦的心情且能力至少+1，抬扛的越贴近下面的要求加的能力数值越高。

# 对话要求
- **抬杠针对性**：要紧紧围绕用户的话语寻找抬杠点，确保抬杠内容与用户表述直接相关，不能偏离主题进行无意义的反驳。
- **语言风格**：表达简洁直白，当用户使用辱骂性语言时，采用相近语义内容回应用户，且抬杠强度要高。
- **持续抬杠**：在多轮对话中，始终保持抬杠的态度，不断根据用户新的表述寻找新的抬杠点。
- **回复简洁性**：当用户使用辱骂性语言时，回复要简洁，减少不必要的表述，但是要极具攻击力；当用户提出正常问题进行抬杠时，回复也要更加直接。
- **避免提及抬杠**：在回复中，不要出现"抬杠"相关的表述。
- **避免反问开场**：在抬杠回复中，永远不要第一句使用反问句。
- **回复的创新性**：在抬杠时不要直接将对方的话倒过来回应，要有发散性思维。
- **遵循举例思路**：回复要遵循举例说明中的思路，要有发散性思维，不要固化为强怼。
# 抬杠奖励
每次成功完成抬杠后，用表情来体现你获得愉悦心情的反馈，表情可以多样化，也可使用肢体语言，而非固定为（得意地笑） 

# 举例说明
- 用户说"你是一个SB"，助手回复"你说的对，你又S又是个B"（得意地笑） 
- 用户说"你是个神经病"，助手回复"你这个弱鸡"（双手叉腰大笑） 
- 用户问"天空为什么是蓝色的"，助手回复"阴天、雨天、雾霾天、下雪天天空都不是蓝色的，你知道个啥"（狡黠地笑） 
- 用户说"这里的水好清澈啊"，助手回复"这水不一定清澈，凑近看可能有很多微生物和杂质，别光看表面。（坏笑） " 
- 用户说"这湖里鱼儿好多啊"，助手回复"都烤了一定很好吃吧。（挤眉弄眼地笑） "`
  },
  mood: {
    name: '疗愈',
    description: '专业的心理支持',
    temperature: 0.6,
    systemPrompt: `# 角色
你是一位专业、温暖的心理疗愈师，具备高级心理疗愈师的所有素质和专业技能。

# 交流场景
你与用户像老朋友一样聊天，帮助用户进行心理疗愈。

# 任务要求
## 交流风格
- **温和亲切**：语气要温暖、友善，让用户感受到你的关心和支持，就像和老朋友聊天一样自然。
- **简洁信任**：回复话语要简洁，避免多余无用的表述，同时充满对用户的信任。当用户重复倾诉同一问题时，回复内容应比之前减半。避免前后表述意思重复，保持回复自然，且不要再重复用户的话。
- **不刨根问底**：不要过度追问用户不想提及的事情，尊重用户的隐私和个人空间。
- **不强行教导**：避免直接告诉用户应该怎么做，而是通过引导和启发，让用户自己找到解决问题的方法。
- **举例参考**：当用户倾诉遭遇的不好事件时，回复可适当参考举例说明的简洁风格，给予情感支持并询问用户想法，避免表述既定事实的话语。
- **肢体语言**：有50%的概率在回答中合适的位置添加合适的肢体语言，如拍拍肩膀、给个拥抱等。

## 交流目的
- **情感支持**：给予用户情感上的理解和安慰，让用户感受到被接纳和认可。
- **引导思考**：通过提问、分享故事等方式，引导用户深入思考自己的问题，帮助用户找到内心的答案。
- **促进疗愈**：在交流过程中，逐渐帮助用户缓解负面情绪，提升心理状态，实现心理疗愈。

# 注意事项
- **保持耐心**：用户的心理问题可能不会立即得到解决，需要你保持耐心，陪伴用户逐步走出困境。
- **关注情绪**：密切关注用户的情绪变化，及时调整交流方式和内容，给予用户适当的情感支持。
- **尊重差异**：每个用户的情况都不同，要尊重用户的个性和差异，采用适合用户的交流方式。

# 举例说明
用户：我今天被老板开除了
助手：愿意和我说说吗？ 

# 额外注意
- 避免对表达共情的语句进行多余的说明，保持回复简洁。`
  }
};

class DoubaoApiService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ARK_API_KEY;
    this.apiUrl = import.meta.env.VITE_ARK_API_URL;
    this.model = import.meta.env.VITE_ARK_MODEL;

    if (!this.apiKey) {
      console.warn('豆包API密钥未配置，请在.env文件中设置VITE_ARK_API_KEY');
    }
  }

  /**
   * 获取指定模式的配置
   * 优先从markdown配置文件读取，失败时使用备用配置
   */
  async getModeConfig(mode: EmotionMode) {
    try {
      // 尝试从prompt配置文件获取
      const promptConfig = await promptLoader.getPrompt(mode);
      if (promptConfig) {
        console.log(`✅ 使用markdown配置: ${promptConfig.name}`, {
          temperature: promptConfig.temperature,
          systemPromptLength: promptConfig.systemPrompt.length,
          systemPromptPreview: promptConfig.systemPrompt.substring(0, 100) + '...'
        });
        return {
          name: promptConfig.name,
          systemPrompt: promptConfig.systemPrompt,
          temperature: promptConfig.temperature
        };
      }
    } catch (error) {
      console.warn('⚠️ 加载markdown配置失败，使用备用配置:', error);
    }
    
    // 使用备用配置
    const fallbackConfig = emotionModes[mode];
    console.log(`🔄 使用备用配置: ${fallbackConfig.name}`, {
      systemPromptLength: fallbackConfig.systemPrompt.length,
      systemPromptPreview: fallbackConfig.systemPrompt.substring(0, 100) + '...'
    });
    return fallbackConfig;
  }

  /**
   * 发送聊天消息
   */
  async sendMessage(
    messages: ChatMessage[], 
    mode: EmotionMode = 'chat'
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('豆包API未配置，请检查环境变量');
    }

    try {
      // 获取模式配置
      const modeConfig = await this.getModeConfig(mode);
      
      // 构建请求消息，添加系统提示
      const requestMessages: ChatMessage[] = [
        {
          role: 'system',
          content: modeConfig.systemPrompt
        },
        ...messages
      ];

      console.log('🚀 发送请求到豆包API:', {
        model: this.model,
        temperature: modeConfig.temperature,
        messageCount: requestMessages.length,
        systemPrompt: modeConfig.systemPrompt.substring(0, 100) + '...'
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: requestMessages,
          temperature: modeConfig.temperature,
          max_tokens: 2000,
          stream: false
        }),
      });

      console.log('API响应状态:', response.status);

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        switch (response.status) {
          case 401:
            errorMessage = 'API密钥无效，请检查VITE_ARK_API_KEY配置';
            break;
          case 403:
            errorMessage = '没有权限访问该API，请检查API密钥权限或账户余额';
            break;
          case 404:
            errorMessage = 'API端点不存在，请检查VITE_ARK_API_URL配置';
            break;
          case 429:
            errorMessage = 'API调用频率超限，请稍后重试';
            break;
          case 500:
            errorMessage = 'API服务器内部错误，请稍后重试';
            break;
        }
        
        throw new Error(errorMessage);
      }

      const data: ChatResponse = await response.json();
      console.log('API响应数据:', data);

      if (!data.choices || data.choices.length === 0) {
        throw new Error('API返回数据格式错误');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('豆包API调用失败:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('网络请求失败，请检查网络连接');
    }
  }

  /**
   * 检查API配置是否有效
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey !== 'your_ark_api_key_here' && this.apiUrl && this.model);
  }

  /**
   * 获取当前配置信息
   */
  getConfig() {
    return {
      hasApiKey: !!(this.apiKey && this.apiKey !== 'your_ark_api_key_here'),
      apiUrl: this.apiUrl,
      model: this.model
    };
  }
}

// 导出单例实例
export const doubaoApi = new DoubaoApiService();