'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { IMAGE_SIZES, ASPECT_RATIOS, OPENAI_SIZES, DOUBAO_SIZES, ApiProvider } from '@/types';
import { Settings2, Square, Monitor, Pencil } from 'lucide-react';

interface SizeSelectorProps {
  provider: ApiProvider;
  // Gemini 参数
  aspectRatio: string;
  imageSize: string;
  // OpenAI 参数
  openaiSize: string;
  // 豆包参数
  doubaoSize: string;
  useCustomSize: boolean;
  useOpenaiCustomSize?: boolean;
  apiKey: string;
  onSizeChange: (params: {
    aspectRatio?: string;
    imageSize?: string;
    openaiSize?: string;
    doubaoSize?: string;
    useCustomSize?: boolean;
    useOpenaiCustomSize?: boolean;
  }) => void;
}

// 验证宽高比格式（如 "16:9", "21:9", "1.85:1"）
function isValidAspectRatio(value: string): boolean {
  return /^\d+(\.\d+)?:\d+(\.\d+)?$/.test(value);
}

// 验证 OpenAI 尺寸格式（如 "1536x1024", "1024x1024"）
function isValidOpenAISize(value: string): boolean {
  // 格式: 宽x高，宽高都是数字，范围大约 256-4096
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) return false;
  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);
  // OpenAI 支持的尺寸范围大约是 256-4096
  return width >= 256 && width <= 4096 && height >= 256 && height <= 4096;
}

export function SizeSelector({ 
  provider, 
  aspectRatio, 
  imageSize, 
  openaiSize,
  doubaoSize,
  useCustomSize,
  useOpenaiCustomSize = false,
  apiKey, 
  onSizeChange 
}: SizeSelectorProps) {
  // 判断当前是否是自定义宽高比
  const isCustomAspect = aspectRatio && !ASPECT_RATIOS.some(r => r.value === aspectRatio);
  
  // 判断当前是否是自定义 OpenAI 尺寸
  const isCustomOpenAISize = openaiSize && !OPENAI_SIZES.some(s => s.value === openaiSize);
  
  const [showCustomInput, setShowCustomInput] = useState(!!isCustomAspect);
  const [customAspectRatio, setCustomAspectRatio] = useState(isCustomAspect ? aspectRatio : '');
  const [customError, setCustomError] = useState('');
  
  // OpenAI 自定义尺寸状态
  const [showCustomOpenAIInput, setShowCustomOpenAIInput] = useState(!!isCustomOpenAISize);
  const [customOpenAISize, setCustomOpenAISize] = useState(isCustomOpenAISize ? openaiSize : '');
  const [customOpenAIError, setCustomOpenAIError] = useState('');
  
  const handleCustomSizeChange = (checked: boolean) => {
    onSizeChange({ useCustomSize: checked });
  };

  const handleAspectRatioChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true);
      // 如果已有自定义值，保持；否则等待输入
      if (customAspectRatio && isValidAspectRatio(customAspectRatio)) {
        onSizeChange({ aspectRatio: customAspectRatio });
      }
    } else {
      setShowCustomInput(false);
      setCustomAspectRatio('');
      onSizeChange({ aspectRatio: value });
    }
  };

  const handleCustomAspectRatioChange = (value: string) => {
    setCustomAspectRatio(value);
    
    // 实时验证
    if (value && !isValidAspectRatio(value)) {
      setCustomError('格式错误，请输入如 21:9 或 2.35:1');
    } else {
      setCustomError('');
      if (value && isValidAspectRatio(value)) {
        onSizeChange({ aspectRatio: value });
      }
    }
  };

  const handleImageSizeChange = (value: string) => {
    onSizeChange({ imageSize: value });
  };

  const handleOpenAISizeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomOpenAIInput(true);
      // 如果已有自定义值，保持；否则等待输入
      if (customOpenAISize && isValidOpenAISize(customOpenAISize)) {
        onSizeChange({ openaiSize: customOpenAISize });
      }
    } else {
      setShowCustomOpenAIInput(false);
      setCustomOpenAISize('');
      setCustomOpenAIError('');
      onSizeChange({ openaiSize: value });
    }
  };

  const handleCustomOpenAISizeChange = (value: string) => {
    setCustomOpenAISize(value);
    
    if (!value) {
      setCustomOpenAIError('');
      return;
    }
    
    if (isValidOpenAISize(value)) {
      setCustomOpenAIError('');
      onSizeChange({ openaiSize: value });
    } else {
      setCustomOpenAIError('格式错误，请使用 宽x高 格式（如 1536x1024）');
    }
  };

  const handleDoubaoSizeChange = (value: string) => {
    onSizeChange({ doubaoSize: value });
  };

  const currentAspect = ASPECT_RATIOS.find(a => a.value === aspectRatio);
  
  // 所有尺寸选项都可用
  const availableGeminiSizes = IMAGE_SIZES;

  // 显示当前的宽高比标签
  const getAspectDisplayLabel = () => {
    if (isCustomAspect && aspectRatio) {
      return `自定义 (${aspectRatio})`;
    }
    return currentAspect?.label || '选择宽高比';
  };

  return (
    <div className="space-y-3">
      {/* 高级设置开关 */}
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="custom-size" 
          checked={useCustomSize}
          onCheckedChange={(checked) => handleCustomSizeChange(checked as boolean)}
        />
        <label
          htmlFor="custom-size"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5"
        >
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          指定图片尺寸
        </label>
      </div>

      {/* 尺寸设置面板 */}
      {useCustomSize && (
        <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
          {provider === 'doubao' ? (
            <>
              {/* 豆包: 尺寸选择 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  图片尺寸
                </Label>
                <div className="flex gap-2">
                  {DOUBAO_SIZES.map((size) => (
                    <Button
                      key={size.id}
                      type="button"
                      variant={doubaoSize === size.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDoubaoSizeChange(size.value)}
                      className="flex-1 h-8"
                    >
                      <span className="font-medium text-sm">{size.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : provider === 'gemini' ? (
            <>
              {/* Gemini: 宽高比选择 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Square className="h-3 w-3" />
                  宽高比
                </Label>
                <Select 
                  value={isCustomAspect ? 'custom' : aspectRatio} 
                  onValueChange={handleAspectRatioChange}
                >
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="选择宽高比" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.id} value={ratio.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ratio.label}</span>
                          <span className="text-muted-foreground text-xs">
                            ({ratio.value})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {/* 自定义选项 */}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">自定义比例</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 自定义宽高比输入框 */}
                {showCustomInput && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="如 21:9 或 2.35:1"
                        value={customAspectRatio}
                        onChange={(e) => handleCustomAspectRatioChange(e.target.value)}
                        className={`h-8 flex-1 ${customError ? 'border-destructive' : ''}`}
                      />
                    </div>
                    {customError && (
                      <p className="text-xs text-destructive">{customError}</p>
                    )}
                    {!customError && (
                      <p className="text-xs text-muted-foreground">
                        输入格式：宽度:高度（如 21:9、2.35:1）
                      </p>
                    )}
                  </div>
                )}
                
                {/* 当前选中的预设描述 */}
                {!showCustomInput && currentAspect && (
                  <p className="text-xs text-muted-foreground">{currentAspect.description}</p>
                )}
              </div>

              {/* Gemini: 分辨率选择 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  分辨率
                </Label>
                <div className="flex gap-2">
                  {availableGeminiSizes.map((size) => (
                    <Button
                      key={size.id}
                      type="button"
                      variant={imageSize === size.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleImageSizeChange(size.value)}
                      className="flex-1 h-8"
                    >
                      <span className="font-medium text-sm">{size.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* OpenAI: 尺寸选择 */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  图片尺寸
                </Label>
                <Select value={showCustomOpenAIInput ? 'custom' : openaiSize} onValueChange={handleOpenAISizeChange}>
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="选择尺寸" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPENAI_SIZES.map((size) => (
                      <SelectItem key={size.id} value={size.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{size.label}</span>
                          <span className="text-muted-foreground text-xs">
                            {size.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        <span className="font-medium">自定义尺寸</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* 自定义尺寸输入 */}
                {showCustomOpenAIInput && (
                  <div className="space-y-1.5">
                    <Input
                      placeholder="输入尺寸，如 1536x1024"
                      value={customOpenAISize}
                      onChange={(e) => handleCustomOpenAISizeChange(e.target.value)}
                      className={`h-8 ${customOpenAIError ? 'border-destructive' : ''}`}
                    />
                    {customOpenAIError && (
                      <p className="text-xs text-destructive">{customOpenAIError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      格式: 宽x高，支持范围 256-4096
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 当前设置显示 */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-background rounded text-xs">
            <span className="text-muted-foreground">输出:</span>
            <span className="font-mono font-medium">
              {provider === 'doubao' 
                ? (doubaoSize === '2k' ? '2048×2048' : '4096×4096')
                : provider === 'gemini' 
                  ? (aspectRatio === 'auto' 
                      ? `${imageSize}（自动比例）` 
                      : `${aspectRatio} · ${imageSize}`)
                  : (showCustomOpenAIInput && customOpenAISize ? customOpenAISize : openaiSize)
              }
            </span>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <p className="text-xs text-muted-foreground">
        💡 默认由模型决定尺寸。勾选上方选项可指定宽高比和分辨率。
      </p>
    </div>
  );
}
