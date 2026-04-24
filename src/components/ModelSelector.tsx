'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, Sparkles, Bot, Palette } from 'lucide-react';
import type { ApiProvider, ProviderConfig } from '@/types';
import { DEFAULT_MODELS } from '@/types';

// 缓存 key 前缀
const MODELS_CACHE_PREFIX = 'ai-image-models-cache-';

// 模型信息
interface ModelInfo {
  name: string;
  displayName: string;
  provider: ApiProvider;
}

// API 配置状态（简化版）
interface ApiConfigState {
  currentProvider: ApiProvider;
  providers: {
    doubao: ProviderConfig;
    gemini: ProviderConfig;
    openai: ProviderConfig;
  };
  selectedModel: string;
  aspectRatio: string;
  imageSize: string;
  openaiSize: string;
  doubaoSize: string;
  useCustomSize: boolean;
}

// 生成缓存 key
function getCacheKey(provider: ApiProvider, baseUrl: string): string {
  const normalizedUrl = baseUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
  return `${MODELS_CACHE_PREFIX}${provider}-${normalizedUrl}`;
}

// 从缓存读取模型列表
function getModelsFromCache(provider: ApiProvider, baseUrl: string): ModelInfo[] | null {
  try {
    const cacheKey = getCacheKey(provider, baseUrl);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Failed to read models from cache:', e);
  }
  return null;
}

// 保存模型列表到缓存
function saveModelsToCache(provider: ApiProvider, baseUrl: string, models: ModelInfo[]): void {
  try {
    const cacheKey = getCacheKey(provider, baseUrl);
    localStorage.setItem(cacheKey, JSON.stringify(models));
  } catch (e) {
    console.error('Failed to save models to cache:', e);
  }
}

interface ModelSelectorProps {
  apiConfig: ApiConfigState;
  selectedModel: string;
  currentProvider: ApiProvider;
  currentProviderConfig: ProviderConfig;
  onModelChange: (model: string) => void;
}

interface ModelsResponse {
  success?: boolean;
  models?: ModelInfo[];
  error?: string;
}

export function ModelSelector({
  apiConfig,
  selectedModel,
  currentProvider,
  currentProviderConfig,
  onModelChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromCache, setHasLoadedFromCache] = useState(false);
  
  // 用于取消过期请求
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentProviderRef = useRef<ApiProvider>(currentProvider);

  const fetchModels = useCallback(async (forceRefresh: boolean = false) => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 更新当前供应商引用
    currentProviderRef.current = currentProvider;
    
    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // 豆包使用内置模型列表，不需要从 API 获取
    if (currentProvider === 'doubao') {
      const doubaoModels = [
        { name: 'doubao-seedream-4-5-251128', displayName: 'SeedReam 4.5', provider: 'doubao' as ApiProvider },
      ];
      setModels(doubaoModels);
      if (!selectedModel) {
        onModelChange('doubao-seedream-4-5-251128');
      }
      return;
    }

    if (!currentProviderConfig.baseUrl || !currentProviderConfig.apiKey) {
      setModels([]);
      return;
    }

    // 如果不是强制刷新，先尝试从缓存读取
    if (!forceRefresh) {
      const cachedModels = getModelsFromCache(currentProvider, currentProviderConfig.baseUrl);
      if (cachedModels && cachedModels.length > 0) {
        setModels(cachedModels);
        setHasLoadedFromCache(true);
        
        // 如果当前没有选择模型，自动选择默认模型或第一个
        if (!selectedModel && cachedModels.length > 0) {
          const defaultModel = DEFAULT_MODELS[currentProvider];
          const hasDefaultModel = cachedModels.some(m => m.name === defaultModel || m.name === `models/${defaultModel}`);
          onModelChange(hasDefaultModel ? defaultModel : cachedModels[0].name);
        }
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: currentProviderConfig.baseUrl,
          apiKey: currentProviderConfig.apiKey,
          provider: currentProvider,
        }),
        signal: abortController.signal,
      });

      const data: ModelsResponse = await response.json();
      
      // 检查请求是否已被取消，以及供应商是否还是当前的
      if (abortController.signal.aborted || currentProviderRef.current !== currentProvider) {
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `获取模型列表失败: ${response.status}`);
      }

      const allModels = data.models || [];
      
      // 保存到缓存
      if (allModels.length > 0) {
        saveModelsToCache(currentProvider, currentProviderConfig.baseUrl, allModels);
      }
      
      setModels(allModels);
      setHasLoadedFromCache(false);

      // 如果当前选择的模型不在列表中，清空选择
      if (selectedModel && !allModels.find(m => m.name === selectedModel)) {
        if (allModels.length > 0) {
          const defaultModel = DEFAULT_MODELS[currentProvider];
          const hasDefaultModel = allModels.some(m => m.name === defaultModel || m.name === `models/${defaultModel}`);
          onModelChange(hasDefaultModel ? defaultModel : allModels[0].name);
        } else {
          onModelChange('');
        }
      } else if (!selectedModel && allModels.length > 0) {
        // 如果没有选择模型，自动选择默认模型或第一个
        const defaultModel = DEFAULT_MODELS[currentProvider];
        const hasDefaultModel = allModels.some(m => m.name === defaultModel || m.name === `models/${defaultModel}`);
        onModelChange(hasDefaultModel ? defaultModel : allModels[0].name);
      }
    } catch (err) {
      // 忽略取消错误
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch models:', err);
      setError(err instanceof Error ? err.message : '获取模型列表失败');
    } finally {
      // 只有当前请求没有被取消时才更新加载状态
      if (!abortController.signal.aborted && currentProviderRef.current === currentProvider) {
        setIsLoading(false);
      }
    }
  }, [currentProviderConfig.baseUrl, currentProviderConfig.apiKey, currentProvider, selectedModel, onModelChange]);

  // 当供应商配置变化时获取模型列表（从缓存或请求）
  useEffect(() => {
    setHasLoadedFromCache(false);
    fetchModels(false);
  }, [currentProviderConfig.baseUrl, currentProviderConfig.apiKey, currentProvider]);

  // 组件卸载时取消未完成的请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    fetchModels(true);
  };

  const isConfigured = currentProvider === 'doubao' || (currentProviderConfig.baseUrl && currentProviderConfig.apiKey);

  // 获取当前选中模型的信息
  const selectedModelInfo = models.find((m) => m.name === selectedModel || m.name === `models/${selectedModel}`);

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        请先在设置中配置 {currentProvider === 'gemini' ? 'Gemini' : 'GPT Image'} API
      </div>
    );
  }

  if (!currentProviderConfig.enabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        当前供应商已禁用，请在设置中启用
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        key={currentProvider}
        value={selectedModel}
        onValueChange={(value) => {
          onModelChange(value);
        }}
        disabled={isLoading || models.length === 0}
      >
        <SelectTrigger className="w-full min-w-[200px]">
          <SelectValue placeholder="选择模型..." />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {models.length === 0 && !isLoading && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              未找到该供应商的图片生成模型
            </div>
          )}
          
          {models.map((model) => (
            <SelectItem key={model.name} value={model.name}>
              <div className="flex items-center gap-2">
                {model.provider === 'doubao' ? (
                  <Palette className="h-3 w-3 text-orange-500" />
                ) : model.provider === 'gemini' ? (
                  <Sparkles className="h-3 w-3 text-primary" />
                ) : (
                  <Bot className="h-3 w-3 text-blue-500" />
                )}
                <span>{model.displayName || model.name.split('/').pop()}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isLoading}
        title={hasLoadedFromCache ? "从缓存加载，点击刷新" : "刷新模型列表"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
      {error && (
        <span className="text-xs text-destructive" title={error}>
          加载失败
        </span>
      )}
    </div>
  );
}
