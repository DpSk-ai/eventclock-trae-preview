/**
 * TRAE on Campus 黑客松品牌配置
 * 现场活动主题文案、阶段信息、视觉参数
 */

export interface BrandingConfig {
  // 主标识
  eventTitle: string;
  eventSubtitle: string;
  organization: string;

  // 活动阶段（可编辑）
  phases: {
    registration: string;
    hacking: string;
    submission: string;
    presentation: string;
    judging: string;
    ceremony: string;
  };

  // 路演计时（队伍/选手名称可编辑）
  roadshow: {
    defaultTeamName: string;
    sessionLabel: string;
  };

  // 视觉参数
  visual: {
    primaryColor: string;
    accentColor: string;
    particleCount: number;
    animationIntensity: 'low' | 'medium' | 'high';
  };
}

export const DEFAULT_BRANDING: BrandingConfig = {
  eventTitle: 'TRAE on Campus',
  eventSubtitle: 'AI Coding Hackathon',
  organization: '四川大学',

  phases: {
    registration: '签到与组队',
    hacking: '编程时间',
    submission: '作品提交',
    presentation: '路演展示',
    judging: '评审中',
    ceremony: '颁奖典礼',
  },

  roadshow: {
    defaultTeamName: '参赛队伍',
    sessionLabel: '路演环节',
  },

  visual: {
    primaryColor: '#93adff',
    accentColor: '#6c8cff',
    particleCount: 50,
    animationIntensity: 'medium',
  },
};

// 可通过此函数运行时更新配置
let currentBranding = { ...DEFAULT_BRANDING };

export function getBranding(): BrandingConfig {
  return currentBranding;
}

export function updateBranding(partial: Partial<BrandingConfig>): void {
  currentBranding = { ...currentBranding, ...partial };
}

export function resetBranding(): void {
  currentBranding = { ...DEFAULT_BRANDING };
}
