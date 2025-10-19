/**
 * 音频播放队列管理器
 * 确保同时只有一个音频在播放，其他音频需要等待当前播放完成
 */
class AudioQueueManager {
  private currentPlayingId: string | null = null;
  private playQueue: Array<{ id: string; playFn: () => Promise<void> }> = [];
  private isProcessing = false;

  /**
   * 注册音频播放请求
   * @param id 音频唯一标识
   * @param playFn 播放函数
   */
  async requestPlay(id: string, playFn: () => Promise<void>): Promise<void> {
    // 如果当前没有音频在播放，直接播放
    if (!this.currentPlayingId) {
      this.currentPlayingId = id;
      try {
        await playFn();
      } finally {
        this.currentPlayingId = null;
        this.processQueue();
      }
      return;
    }

    // 如果是同一个音频，停止当前播放并重新播放
    if (this.currentPlayingId === id) {
      this.stopCurrent();
      this.currentPlayingId = id;
      try {
        await playFn();
      } finally {
        this.currentPlayingId = null;
        this.processQueue();
      }
      return;
    }

    // 否则加入队列等待
    return new Promise((resolve) => {
      this.playQueue.push({
        id,
        playFn: async () => {
          try {
            await playFn();
            resolve();
          } catch (error) {
            console.error('音频播放失败:', error);
            resolve();
          }
        }
      });
    });
  }

  /**
   * 停止当前播放的音频
   */
  stopCurrent(): void {
    if (this.currentPlayingId) {
      // 通过事件通知当前播放的音频停止
      window.dispatchEvent(new CustomEvent('audioQueueStop', { 
        detail: { id: this.currentPlayingId } 
      }));
      this.currentPlayingId = null;
    }
  }

  /**
   * 音频播放完成通知
   * @param id 完成播放的音频ID
   */
  onPlayEnded(id: string): void {
    if (this.currentPlayingId === id) {
      this.currentPlayingId = null;
      this.processQueue();
    }
  }

  /**
   * 处理播放队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.playQueue.length === 0 || this.currentPlayingId) {
      return;
    }

    this.isProcessing = true;
    
    while (this.playQueue.length > 0 && !this.currentPlayingId) {
      const nextItem = this.playQueue.shift();
      if (nextItem) {
        this.currentPlayingId = nextItem.id;
        try {
          await nextItem.playFn();
        } finally {
          this.currentPlayingId = null;
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * 获取当前播放状态
   */
  getCurrentPlayingId(): string | null {
    return this.currentPlayingId;
  }

  /**
   * 检查指定音频是否正在播放
   */
  isPlaying(id: string): boolean {
    return this.currentPlayingId === id;
  }

  /**
   * 清空播放队列
   */
  clearQueue(): void {
    this.playQueue = [];
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.playQueue.length;
  }
}

// 导出单例实例
export const audioQueueManager = new AudioQueueManager();