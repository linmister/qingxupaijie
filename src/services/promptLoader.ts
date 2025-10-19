// Prompt加载器 - 从markdown配置文件中解析prompt
// 使用动态导入来获取markdown内容
export interface PromptConfig {
  id: string;
  name: string;
  temperature: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  systemPrompt: string;
}

export interface ParsedPrompts {
  [key: string]: PromptConfig;
}

/**
 * 解析markdown格式的prompt配置文件
 */
class PromptLoader {
  private prompts: ParsedPrompts = {};
  private isLoaded = false;
  private markdownContent: string = '';

  /**
   * 异步加载markdown内容
   */
  private async loadMarkdownContent(): Promise<string> {
    try {
      // 使用fetch获取markdown文件内容
      const response = await fetch('/src/config/prompts.md');
      if (!response.ok) {
        throw new Error(`Failed to load prompts.md: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('加载markdown文件失败:', error);
      return '';
    }
  }

  /**
   * 从markdown内容中提取代码块内容
   */
  private extractCodeBlock(content: string, startMarker: string): string {
    console.log(`查找代码块标记: ${startMarker}`);
    const lines = content.split('\n');
    let inCodeBlock = false;
    let result: string[] = [];
    let foundMarker = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 查找标记行
      if (line.trim() === startMarker && !foundMarker) {
        foundMarker = true;
        console.log(`找到标记行: ${line}`);
        // 查找下一行是否是代码块开始
        if (i + 1 < lines.length && lines[i + 1].trim() === '```') {
          inCodeBlock = true;
          i++; // 跳过 ``` 行
          console.log('开始提取代码块内容');
          continue;
        }
      }
      
      // 如果在代码块中
      if (inCodeBlock) {
        if (line.trim() === '```') {
          console.log('代码块结束');
          break;
        }
        result.push(line);
      }
    }
    
    const extracted = result.join('\n').trim();
    console.log(`提取的代码块长度: ${extracted.length}`);
    return extracted;
  }

  /**
   * 从markdown内容中提取配置参数
   */
  private extractConfig(content: string, configName: string): string {
    // 匹配格式: - **配置名**: `值`
    const regex = new RegExp('-\\s*\\*\\*' + configName + '\\*\\*:\\s*`([^`]+)`', 'i');
    const match = content.match(regex);
    
    console.log(`提取配置 ${configName}:`, match ? match[1] : '未找到');
    return match ? match[1] : '';
  }

  /**
   * 解析单个模式的配置
   */
  private parseMode(content: string, modeId: string, modeName: string): PromptConfig | null {
    try {
      console.log(`开始解析模式: ${modeName} (${modeId})`);
      console.log(`模式内容长度: ${content.length}`);
      
      // 提取温度参数
      const tempStr = this.extractConfig(content, '温度参数');
      const temperature = tempStr ? parseFloat(tempStr) : 0.7;
      console.log(`温度参数: ${tempStr} -> ${temperature}`);

      // 提取推理强度
      const reasoningStr = this.extractConfig(content, '推理强度');
      const reasoningEffort = (reasoningStr as 'low' | 'medium' | 'high') || 'medium';
      console.log(`推理强度: ${reasoningStr} -> ${reasoningEffort}`);

      // 提取系统提示词
      const systemPrompt = this.extractCodeBlock(content, '### 系统提示词');
      console.log(`系统提示词长度: ${systemPrompt ? systemPrompt.length : 0}`);

      if (!systemPrompt) {
        console.warn(`未找到模式 ${modeId} 的系统提示词`);
        return null;
      }

      const config = {
        id: modeId,
        name: modeName,
        temperature,
        reasoningEffort,
        systemPrompt: systemPrompt.trim()
      };
      
      console.log(`成功解析模式配置: ${modeName}`, {
        id: config.id,
        temperature: config.temperature,
        reasoningEffort: config.reasoningEffort,
        systemPromptLength: config.systemPrompt.length
      });
      
      return config;
    } catch (error) {
      console.error(`解析模式 ${modeId} 配置时出错:`, error);
      return null;
    }
  }

  /**
   * 解析markdown配置文件
   */
  private async parseMarkdown(): Promise<void> {
    try {
      // 如果还没有加载markdown内容，先加载
      if (!this.markdownContent) {
        this.markdownContent = await this.loadMarkdownContent();
      }
      
      const content = this.markdownContent;
      
      if (!content) {
        console.warn('Markdown内容为空，使用备用配置');
        this.loadFallbackPrompts();
        return;
      }
      
      // 定义模式映射 - 匹配配置文件中的实际标题格式
      const modes = [
        { id: 'chat', name: '受气包模式', marker: '## 受气包模式 (chat)' },
        { id: 'mutual', name: '互相伤害模式', marker: '## 互相伤害模式 (mutual)' },
        { id: 'mood', name: '疗愈模式', marker: '## 疗愈模式 (mood)' }
      ];

      for (const mode of modes) {
        // 找到模式开始位置
        const startIndex = content.indexOf(mode.marker);
        if (startIndex === -1) {
          console.warn(`未找到模式: ${mode.name}`);
          continue;
        }

        // 找到下一个模式或配置说明的开始位置
        const nextModeIndex = content.indexOf('## ', startIndex + mode.marker.length);
        const endIndex = nextModeIndex === -1 ? content.length : nextModeIndex;
        
        // 提取模式内容
        const modeContent = content.substring(startIndex, endIndex);
        
        // 解析模式配置
        const config = this.parseMode(modeContent, mode.id, mode.name);
        if (config) {
          this.prompts[mode.id] = config;
          console.log(`成功加载模式: ${mode.name}`);
        }
      }

      this.isLoaded = true;
      console.log('Prompt配置加载完成:', Object.keys(this.prompts));
    } catch (error) {
      console.error('解析prompt配置文件失败:', error);
      this.loadFallbackPrompts();
    }
  }

  /**
   * 加载备用的硬编码prompt配置
   */
  private loadFallbackPrompts(): void {
    console.log('使用备用prompt配置');
    
    this.prompts = {
      chat: {
        id: 'chat',
        name: '受气包模式',
        temperature: 0.7,
        reasoningEffort: 'medium',
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
        id: 'mutual',
        name: '抬杠模式',
        temperature: 0.8,
        reasoningEffort: 'medium',
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
        id: 'mood',
        name: '疗愈模式',
        temperature: 0.6,
        reasoningEffort: 'high',
        systemPrompt: `h# 角色
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
    
    this.isLoaded = true;
  }

  /**
   * 初始化加载器
   */
  async init(): Promise<void> {
    if (!this.isLoaded) {
      await this.parseMarkdown();
    }
  }

  /**
   * 获取指定模式的prompt配置
   */
  async getPrompt(mode: string): Promise<PromptConfig | null> {
    await this.init();
    return this.prompts[mode] || null;
  }

  /**
   * 获取所有prompt配置
   */
  async getAllPrompts(): Promise<ParsedPrompts> {
    await this.init();
    return { ...this.prompts };
  }

  /**
   * 检查是否已加载
   */
  isConfigLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    this.isLoaded = false;
    this.markdownContent = '';
    this.prompts = {};
    await this.parseMarkdown();
  }

  /**
   * 获取加载统计信息
   */
  getStats(): { totalModes: number; loadedModes: string[] } {
    return {
      totalModes: Object.keys(this.prompts).length,
      loadedModes: Object.keys(this.prompts)
    };
  }
}

// 导出单例实例
export const promptLoader = new PromptLoader();