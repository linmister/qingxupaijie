import React, { useState } from 'react';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { ttsService } from '../services/ttsService';
import VoiceButton from './VoiceButton';

/**
 * TTS配置面板组件
 * 用于测试和调试语音合成功能
 */
export const TTSConfigPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [testText, setTestText] = useState('你好，这是一个语音合成测试。');
  const [selectedMode, setSelectedMode] = useState('心理疗愈');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTestSuccess, setIsTestSuccess] = useState<boolean | null>(null);

  // 获取配置状态
  const configStatus = ttsService.getConfigStatus();
  const isConfigured = ttsService.isConfigured();

  /**
   * 处理测试成功
   */
  const handleTestSuccess = (audioData: string) => {
    setTestResult(`语音合成成功！音频数据长度: ${audioData.length} 字符`);
    setIsTestSuccess(true);
  };

  /**
   * 处理测试失败
   */
  const handleTestError = (error: string) => {
    setTestResult(`语音合成失败: ${error}`);
    setIsTestSuccess(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
        title="打开TTS配置面板"
      >
        <Settings size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border z-50">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Settings size={18} />
          TTS配置面板
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {/* 配置状态 */}
      <div className="p-4 border-b">
        <h4 className="font-medium text-gray-700 mb-2">配置状态</h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {configStatus.hasAppId ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <AlertCircle size={14} className="text-red-500" />
            )}
            <span>APP ID: {configStatus.hasAppId ? '已配置' : '未配置'}</span>
          </div>
          <div className="flex items-center gap-2">
            {configStatus.hasAccessKey ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <AlertCircle size={14} className="text-red-500" />
            )}
            <span>访问密钥: {configStatus.hasAccessKey ? '已配置' : '未配置'}</span>
          </div>
          <div className="flex items-center gap-2">
            {configStatus.hasApiUrl ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <AlertCircle size={14} className="text-red-500" />
            )}
            <span>API地址: {configStatus.hasApiUrl ? '已配置' : '未配置'}</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            资源ID: {configStatus.resourceId}
          </div>
        </div>

        {!isConfigured && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            请在.env文件中配置TTS相关环境变量：
            <br />• VITE_TTS_APP_ID
            <br />• VITE_TTS_ACCESS_KEY
            <br />• VITE_TTS_API_URL
          </div>
        )}
      </div>

      {/* 测试区域 */}
      <div className="p-4">
        <h4 className="font-medium text-gray-700 mb-3">功能测试</h4>
        
        {/* 测试文本 */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">测试文本</label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="输入要测试的文本..."
          />
        </div>

        {/* 模式选择 */}
        <div className="mb-3">
          <label className="block text-sm text-gray-600 mb-1">语音模式</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="受气包">受气包模式</option>
            <option value="抬杠">抬杠模式</option>
            <option value="心理疗愈">心理疗愈模式</option>
          </select>
        </div>

        {/* 测试按钮 */}
        <div className="flex items-center gap-2 mb-3">
          <VoiceButton
            text={testText}
            mode={selectedMode}
            size="md"
            disabled={!isConfigured || !testText.trim()}
            onSuccess={handleTestSuccess}
            onError={handleTestError}
            className="flex-shrink-0"
          />
          <span className="text-sm text-gray-600">点击测试语音合成</span>
        </div>

        {/* 测试结果 */}
        {testResult && (
          <div className={`p-2 rounded text-xs ${
            isTestSuccess 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {testResult}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="p-4 border-t bg-gray-50 text-xs text-gray-600">
        <p className="mb-1">💡 使用提示：</p>
        <ul className="space-y-1 ml-2">
          <li>• 确保已正确配置火山引擎TTS API密钥</li>
          <li>• 不同模式使用不同的音色和情感参数</li>
          <li>• 文本长度建议控制在1000字符以内</li>
          <li>• 网络异常时会自动重试3次</li>
        </ul>
      </div>
    </div>
  );
};

export default TTSConfigPanel;