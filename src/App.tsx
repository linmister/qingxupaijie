import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Heart, Smile, Send, AlertCircle, Loader2 } from 'lucide-react';
import { doubaoApi, ChatMessage, emotionModes, EmotionMode } from './services/doubaoApi';
import { promptLoader } from './services/promptLoader';
import { ttsService } from './services/ttsService';
import AudioPlayer from './components/AudioPlayer';

interface DisplayMessage extends ChatMessage {
  id: string;
  timestamp: Date;
  audioData?: string; // 添加音频数据字段
}

function App() {
  const [selectedTab, setSelectedTab] = useState<EmotionMode>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化prompt加载器
  useEffect(() => {
    const initPromptLoader = async () => {
      try {
        await promptLoader.init();
        console.log('Prompt加载器初始化完成:', promptLoader.getStats());
      } catch (error) {
        console.error('Prompt加载器初始化失败:', error);
      }
    };
    
    initPromptLoader();
  }, []);

  // 发送消息处理函数
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // 清除之前的错误
    setError(null);
    
    // 检查API配置
    if (!doubaoApi.isConfigured()) {
      setError('请先在.env文件中配置豆包API密钥');
      return;
    }

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    // 添加用户消息到聊天记录
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // 准备发送给API的消息历史（不包含id和timestamp）
      const chatHistory: ChatMessage[] = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 调用豆包API
      const response = await doubaoApi.sendMessage(chatHistory, selectedTab);
      
      // 为AI回复自动生成语音
      let audioData: string | undefined;
      if (ttsService.isConfigured()) {
        try {
          const voiceMode = selectedTab === 'chat' ? '受气包' : selectedTab === 'mutual' ? '抬杠' : '心理疗愈';
          const ttsResponse = await ttsService.synthesizeByMode(response, voiceMode);
          if (ttsResponse.success && ttsResponse.data?.audio) {
            audioData = ttsResponse.data.audio;
          }
        } catch (ttsError) {
          console.error('语音合成失败:', ttsError);
        }
      }
      
      // 添加AI回复到聊天记录
      const aiMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        audioData
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('发送消息失败:', err);
      setError(err instanceof Error ? err.message : '发送消息失败，请重试');
    } finally {
      setIsLoading(false);
      // AI回答完成后，重新聚焦到输入框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 清空聊天记录
  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  // 获取当前模式的配置
  const currentMode = emotionModes[selectedTab] || emotionModes.chat;
  
  const tabs: Array<{ id: EmotionMode; label: string; gradient: string }> = [
    { id: 'chat', label: '受气包', gradient: 'from-red-300 to-red-400' },
    { id: 'mutual', label: '抬杠', gradient: 'from-red-300 to-red-400' },
    { id: 'mood', label: '疗愈', gradient: 'from-red-300 to-red-400' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">情绪排解助手</h1>
          <p className="text-gray-600">选择你的情绪模式，开始对话</p>
        </div>

        {/* 选项卡 */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white rounded-full p-1 shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTab(tab.id);
                  clearMessages(); // 切换模式时清空聊天记录
                }}
                className={`px-8 py-3 rounded-full font-medium transition-all duration-300 min-w-[120px] text-center ${
                  selectedTab === tab.id
                    ? `bg-gradient-to-r ${tab.gradient} text-white shadow-md`
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* API配置状态提示 */}
        {!doubaoApi.isConfigured() && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">
              请在.env文件中配置VITE_ARK_API_KEY以启用AI对话功能
            </span>
          </div>
        )}

        {/* 配置检查提示 - 已隐藏 */}
        {/* 
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">当前配置状态：</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• API密钥: {doubaoApi.getConfig().hasApiKey ? '✅ 已配置' : '❌ 未配置'}</p>
            <p>• 模型ID: {doubaoApi.getConfig().model || '未设置'}</p>
            <p>• API地址: {doubaoApi.getConfig().apiUrl || '未设置'}</p>
          </div>
          {!doubaoApi.getConfig().hasApiKey && (
            <div className="mt-2 text-xs text-blue-600">
              <p>请确保在.env文件中正确配置了有效的豆包API密钥</p>
            </div>
          )}
        </div>
        */}

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        {/* 聊天区域 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* 聊天头部 */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTab === 'chat' && <MessageCircle className="w-6 h-6" />}
                {selectedTab === 'mutual' && <Smile className="w-6 h-6" />}
                {selectedTab === 'mood' && <Heart className="w-6 h-6" />}
                <div>
                  <h2 className="text-xl font-semibold">
                    {tabs.find(tab => tab.id === selectedTab)?.label}模式
                  </h2>
                  <p className="text-purple-100 text-sm">
                    {currentMode.systemPrompt.slice(0, 50)}...
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
                >
                  清空
                </button>
              )}
            </div>
          </div>

          {/* 消息列表 */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <div className="text-6xl mb-4">💭</div>
                <p>开始你的第一条消息吧...</p>
                <p className="text-sm mt-2">当前模式: {tabs.find(tab => tab.id === selectedTab)?.label}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        msg.role === 'user' ? 'text-purple-100' : 'text-gray-500'
                      }`}>
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {/* 为AI回复显示音频播放器 */}
                    {msg.role === 'assistant' && msg.audioData && (
                      <div className="mt-3 -ml-4">
                        <AudioPlayer
                          audioData={msg.audioData}
                          format="mp3"
                          autoPlay={true}
                          className="shadow-sm"
                          showProgress
                          showTime
                          playerId={`message-${msg.id}`}
                          onError={(error) => {
                            console.error('音频播放失败:', error);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* 加载状态 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI正在思考中...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="border-t p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`在${tabs.find(tab => tab.id === selectedTab)?.label}模式下输入消息...`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent h-12"
                  disabled={isLoading}
                  style={{ resize: 'none' }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>

              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
