import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { audioQueueManager } from '../services/audioQueueManager';

interface AudioPlayerProps {
  /** base64编码的音频数据 */
  audioData?: string;
  /** 音频格式 */
  format?: 'mp3' | 'ogg' | 'wav' | 'pcm';
  /** 是否自动播放 */
  autoPlay?: boolean;
  /** 播放完成回调 */
  onEnded?: () => void;
  /** 播放开始回调 */
  onPlay?: () => void;
  /** 播放暂停回调 */
  onPause?: () => void;
  /** 播放错误回调 */
  onError?: (error: string) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示进度条 */
  showProgress?: boolean;
  /** 是否显示时间 */
  showTime?: boolean;
  /** 音频播放器唯一标识，用于队列管理 */
  playerId?: string;
}

/**
 * 音频播放组件
 * 支持base64音频数据的解码和播放，包含播放控制功能
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioData,
  format = 'mp3',
  autoPlay = false,
  onEnded,
  onPlay,
  onPause,
  onError,
  className = '',
  showProgress = true,
  showTime = true,
  playerId,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [error, setError] = useState<string | null>(null);

  // 生成唯一的播放器ID
  const playerIdRef = useRef(playerId || `audio-player-${Date.now()}-${Math.random()}`);
  const currentPlayerId = playerIdRef.current;

  /**
   * 将base64音频数据转换为可播放的URL
   */
  const createAudioUrl = (base64Data: string, audioFormat: string): string => {
    try {
      // 移除可能存在的data URL前缀
      const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
      
      // 将base64转换为二进制数据
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 创建Blob对象
      const mimeType = `audio/${audioFormat === 'ogg' ? 'ogg' : audioFormat}`;
      const blob = new Blob([bytes], { type: mimeType });
      
      // 创建对象URL
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('音频数据转换失败:', err);
      throw new Error('音频数据格式错误');
    }
  };

  /**
   * 格式化时间显示
   */
  const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * 播放音频
   */
  const handlePlay = async () => {
    if (!audioRef.current || !audioData) return;

    // 使用音频队列管理器确保同时只有一个音频播放
    await audioQueueManager.requestPlay(currentPlayerId, async () => {
      if (!audioRef.current || !audioData) return;

      try {
        setIsLoading(true);
        setError(null);
        
        // 检查音频是否已准备好
        if (audioRef.current.readyState < 2) {
          // 等待音频加载完成
          await new Promise((resolve, reject) => {
            const audio = audioRef.current!;
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              resolve(void 0);
            };
            const handleError = () => {
              audio.removeEventListener('canplay', handleCanPlay);
              audio.removeEventListener('error', handleError);
              reject(new Error('音频加载失败'));
            };
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('error', handleError);
          });
        }
        
        // 停止之前的播放（如果有）
        if (!audioRef.current.paused) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
      } catch (err) {
        // 忽略AbortError，这通常是由于快速切换导致的正常中断
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('播放被中断（正常情况）:', err.message);
          return;
        }
        
        const errorMsg = err instanceof Error ? err.message : '播放失败';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error('音频播放失败:', err);
      } finally {
        setIsLoading(false);
      }
    });
  };

  /**
   * 暂停音频
   */
  const handlePause = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    onPause?.();
  };

  /**
   * 切换播放/暂停
   */
  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  /**
   * 重新播放
   */
  const handleReplay = () => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = 0;
    if (!isPlaying) {
      handlePlay();
    }
  };

  /**
   * 切换静音
   */
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  /**
   * 调整音量
   */
  const handleVolumeChange = (newVolume: number) => {
    if (!audioRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    audioRef.current.volume = clampedVolume;
    setVolume(clampedVolume);
    
    // 如果音量大于0，取消静音
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false);
      audioRef.current.muted = false;
    }
  };

  /**
   * 调整播放进度
   */
  const handleProgressChange = (newProgress: number) => {
    if (!audioRef.current || !duration) return;
    
    const newTime = (newProgress / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 监听音频数据变化，更新音频源
  useEffect(() => {
    if (!audioData || !audioRef.current) return;

    let audioUrl: string | null = null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      audioUrl = createAudioUrl(audioData, format);
      audioRef.current.src = audioUrl;
      
      // 预加载音频
      audioRef.current.load();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '音频加载失败';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsLoading(false);
    }

    // 清理函数：撤销blob URL
    return () => {
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioData, format]); // 移除onError依赖，避免不必要的重新加载

  // 自动播放
  useEffect(() => {
    if (autoPlay && audioData && audioRef.current) {
      handlePlay();
    }
  }, [audioData, autoPlay]);

  // 音频事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // 通知音频队列管理器播放完成
      audioQueueManager.onPlayEnded(currentPlayerId);
      // 使用ref来获取最新的回调函数，避免闭包问题
      if (onEnded) {
        onEnded();
      }
    };

    const handleError = () => {
      const errorMsg = '音频播放出错';
      setError(errorMsg);
      setIsPlaying(false);
      setIsLoading(false);
      // 使用ref来获取最新的回调函数，避免闭包问题
      if (onError) {
        onError(errorMsg);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []); // 移除onEnded和onError依赖，避免重复绑定事件监听器

  // 监听音频队列停止事件
  useEffect(() => {
    const handleQueueStop = (event: CustomEvent) => {
      if (event.detail.id === currentPlayerId && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('audioQueueStop', handleQueueStop as EventListener);
    
    return () => {
      window.removeEventListener('audioQueueStop', handleQueueStop as EventListener);
    };
  }, [currentPlayerId]);

  if (!audioData) {
    return null;
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`audio-player bg-gray-100 rounded-lg p-3 ${className}`}>
      <audio ref={audioRef} preload="metadata" />
      
      {error && (
        <div className="text-red-500 text-sm mb-2 p-2 bg-red-50 rounded">
          播放错误: {error}
        </div>
      )}

      <div className="flex items-center space-x-3">
        {/* 播放控制按钮 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )}
          </button>

          <button
            onClick={handleReplay}
            disabled={isLoading || !!error}
            className="flex items-center justify-center w-8 h-8 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-full transition-colors"
            title="重新播放"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* 进度条 */}
        {showProgress && (
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="100"
              value={progressPercentage}
              onChange={(e) => handleProgressChange(Number(e.target.value))}
              disabled={isLoading || !!error || duration === 0}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        )}

        {/* 时间显示 */}
        {showTime && (
          <div className="text-sm text-gray-600 min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        {/* 音量控制 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="text-gray-600 hover:text-gray-800 transition-colors"
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-16 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer slider"
            title="音量"
          />
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default AudioPlayer;