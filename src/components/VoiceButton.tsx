import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { ttsService, TTSResponse } from '../services/ttsService';
import AudioPlayer from './AudioPlayer';

interface VoiceButtonProps {
  /** 要转换为语音的文本 */
  text: string;
  /** 情感模式 */
  mode?: string;
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 合成成功回调 */
  onSuccess?: (audioData: string) => void;
  /** 合成失败回调 */
  onError?: (error: string) => void;
}

/**
 * 语音按钮组件
 * 点击后调用TTS服务合成语音并播放
 */
export const VoiceButton: React.FC<VoiceButtonProps> = ({
  text,
  mode = '心理疗愈',
  size = 'md',
  disabled = false,
  className = '',
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  /**
   * 获取按钮尺寸样式
   */
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 p-1';
      case 'lg':
        return 'w-10 h-10 p-2';
      default:
        return 'w-8 h-8 p-1.5';
    }
  };

  /**
   * 获取图标尺寸
   */
  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 20;
      default:
        return 16;
    }
  };

  /**
   * 处理语音合成
   */
  const handleVoiceSynthesis = async () => {
    if (!text.trim() || isLoading) return;

    // 检查TTS服务配置
    if (!ttsService.isConfigured()) {
      const configError = 'TTS服务未配置，请检查环境变量';
      setError(configError);
      onError?.(configError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioData(null);

    try {
      console.log('开始语音合成:', { text: text.substring(0, 50), mode });
      
      const response: TTSResponse = await ttsService.synthesizeByMode(text, mode);
      
      if (response.success && response.data?.audio) {
        setAudioData(response.data.audio);
        setShowPlayer(true);
        onSuccess?.(response.data.audio);
        console.log('语音合成成功，音频长度:', response.data.audio.length);
      } else {
        const errorMsg = response.error || '语音合成失败';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error('语音合成失败:', errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '语音合成出错';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('语音合成异常:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理播放完成
   */
  const handlePlayEnded = () => {
    // 播放完成后可以选择隐藏播放器或保持显示
    // setShowPlayer(false);
  };

  /**
   * 处理播放错误
   */
  const handlePlayError = (playError: string) => {
    setError(`播放错误: ${playError}`);
    onError?.(playError);
  };

  /**
   * 切换播放器显示
   */
  const togglePlayer = () => {
    if (audioData) {
      setShowPlayer(!showPlayer);
    } else {
      handleVoiceSynthesis();
    }
  };

  return (
    <div className={`voice-button-container ${className}`}>
      {/* 语音按钮 */}
      <button
        onClick={togglePlayer}
        disabled={disabled || isLoading || !text.trim()}
        className={`
          ${getSizeClasses()}
          flex items-center justify-center
          bg-blue-500 hover:bg-blue-600 
          disabled:bg-gray-400 disabled:cursor-not-allowed
          text-white rounded-full transition-all duration-200
          hover:scale-105 active:scale-95
          ${error ? 'bg-red-500 hover:bg-red-600' : ''}
        `}
        title={
          error 
            ? `语音合成失败: ${error}` 
            : audioData 
              ? (showPlayer ? '隐藏播放器' : '显示播放器')
              : '点击生成语音'
        }
      >
        {isLoading ? (
          <Loader2 size={getIconSize()} className="animate-spin" />
        ) : error ? (
          <VolumeX size={getIconSize()} />
        ) : (
          <Volume2 size={getIconSize()} />
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded max-w-xs">
          {error}
        </div>
      )}

      {/* 音频播放器 */}
      {showPlayer && audioData && (
        <div className="mt-3 min-w-0">
          <AudioPlayer
            audioData={audioData}
            format="mp3"
            autoPlay={true}
            onEnded={handlePlayEnded}
            onError={handlePlayError}
            className="bg-white border border-gray-200"
            showProgress
            showTime
          />
        </div>
      )}

      {/* 调试信息（开发环境） */}
      {import.meta.env.DEV && (
        <div className="mt-2 text-xs text-gray-500">
          <div>模式: {mode}</div>
          <div>文本长度: {text.length}</div>
          {audioData && <div>音频数据: {audioData.substring(0, 20)}...</div>}
        </div>
      )}
    </div>
  );
};

export default VoiceButton;