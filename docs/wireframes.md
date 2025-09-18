# Whop Legends - UX Wireframes & Component Designs

*Created by Sally, UX Expert*

## Overview
This document provides detailed wireframes and component specifications for Whop Legends, a gamified community platform. The designs leverage Frosted UI components to create engaging, game-like interfaces while maintaining professional functionality for analytics and management tools.

## Design System Foundations

### Frosted UI Component Usage
- **Glass morphism effects** for modern, elevated aesthetics
- **Consistent spacing** using Frosted's scale system
- **Cohesive color palette** with game-inspired accent colors
- **Mobile-first responsive** design patterns
- **Accessibility-first** approach with proper contrast ratios

### Color Palette
```typescript
// Primary Colors
primary: {
  base: '#6366f1', // Indigo - main brand color
  light: '#818cf8',
  dark: '#4f46e5'
},
// Gaming Accent Colors
accent: {
  legendary: '#fbbf24', // Gold - for premium/legendary items
  epic: '#a855f7',     // Purple - for epic content
  rare: '#3b82f6',     // Blue - for rare items
  common: '#6b7280'    // Gray - for common items
},
// Status Colors
status: {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4'
}
```

---

## 1. Character Selection Screen

**Purpose**: Critical first impression for new users - must be engaging and intuitive

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Logo & Navigation           │
├─────────────────────────────────────┤
│ Hero Section: "Choose Your Legend"  │
│                                    │
│ ┌─────────────┐ ┌─────────────┐   │
│ │   Character  │ │   Character  │   │
│ │    Card 1    │ │    Card 2    │   │
│ └─────────────┘ └─────────────┘   │
│                                    │
│ ┌─────────────┐ ┌─────────────┐   │
│ │   Character  │ │   Character  │   │
│ │    Card 3    │ │    Card 4    │   │
│ └─────────────┘ └─────────────┘   │
├─────────────────────────────────────┤
│ Filter Bar: Class • Level • Role    │
├─────────────────────────────────────┤
│ Selected Character Details Panel   │
└─────────────────────────────────────┘
```

### Component Specifications

#### CharacterCard Component
```typescript
interface CharacterCardProps {
  id: string;
  name: string;
  class: 'warrior' | 'mage' | 'rogue' | 'paladin';
  level: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  avatar: string;
  stats: {
    strength: number;
    intelligence: number;
    agility: number;
  };
  isSelected?: boolean;
  onSelect: (id: string) => void;
}

// Usage Example
<CharacterCard
  id="warrior-1"
  name="Aldric the Brave"
  class="warrior"
  level={25}
  rarity="legendary"
  avatar="/avatars/warrior-1.png"
  stats={{ strength: 85, intelligence: 45, agility: 60 }}
  isSelected={selectedId === "warrior-1"}
  onSelect={handleSelect}
/>
```

#### CharacterCard Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { Badge } from "@/components/ui/badge";

export const CharacterCard: React.FC<CharacterCardProps> = ({
  name,
  class: characterClass,
  level,
  rarity,
  avatar,
  stats,
  isSelected,
  onSelect
}) => {
  const rarityColors = {
    common: "bg-gray-100 border-gray-300",
    rare: "bg-blue-50 border-blue-300",
    epic: "bg-purple-50 border-purple-300",
    legendary: "bg-yellow-50 border-yellow-300"
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
        isSelected ? 'ring-2 ring-indigo-500 scale-105' : ''
      } ${rarityColors[rarity]}`}
      onClick={() => onSelect(id)}
    >
      <CardContent className="p-6">
        {/* Avatar Section */}
        <div className="relative mb-4">
          <img
            src={avatar}
            alt={name}
            className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg"
          />
          <Badge
            variant={rarity === 'legendary' ? 'premium' : 'default'}
            className="absolute -top-2 -right-2"
          >
            {rarity}
          </Badge>
        </div>

        {/* Character Info */}
        <h3 className="text-lg font-bold text-center mb-2">{name}</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          Level {level} {characterClass}
        </p>

        {/* Stats Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">STR</span>
            <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${stats.strength}%` }}
              />
            </div>
            <span className="text-xs font-medium">{stats.strength}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">INT</span>
            <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${stats.intelligence}%` }}
              />
            </div>
            <span className="text-xs font-medium">{stats.intelligence}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">AGI</span>
            <div className="flex-1 mx-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${stats.agility}%` }}
              />
            </div>
            <span className="text-xs font-medium">{stats.agility}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### Mobile Responsiveness
```css
/* Mobile (default) */
.character-grid {
  grid-template-columns: 1fr;
  gap: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .character-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .character-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Accessibility Considerations
- **Keyboard Navigation**: Tab through character cards, Enter to select
- **Screen Reader Support**: ARIA labels for character stats and rarity
- **High Contrast**: Minimum 4.5:1 contrast ratio for text
- **Focus Management**: Visible focus indicators on interactive elements

### Micro-interactions
- **Card hover**: Scale up (1.05) with shadow enhancement
- **Selection**: Ring animation with spring physics
- **Stat bars**: Smooth fill animations on load
- **Badge shine**: Subtle glow effect for legendary rarity

---

## 2. Main Dashboard/HQ

**Purpose**: Central hub for community members - daily activities, quick access to features

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: User Profile • Notifications │
│ • Coins • Gems • Level Progress     │
├─────────────────────────────────────┤
│ Daily Quests Banner                 │
├─────────────────────────────────────┤
│ Quick Actions Grid                  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │Quest│ │Shop │ │Guild│ │Chat │   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
├─────────────────────────────────────┤
│ Activity Feed                       │
│ • Guild Updates                     │
│ • Friend Achievements               │
│ • System Notifications              │
├─────────────────────────────────────┤
│ Leaderboard Preview                 │
└─────────────────────────────────────┘
```

### Component Specifications

#### DashboardHeader Component
```typescript
interface DashboardHeaderProps {
  user: {
    username: string;
    avatar: string;
    level: number;
    coins: number;
    gems: number;
    experience: number;
    experienceToNext: number;
  };
  notificationCount: number;
}

// Usage Example
<DashboardHeader
  user={{
    username: "LegendsPlayer",
    avatar: "/avatars/user-1.png",
    level: 15,
    coins: 2500,
    gems: 45,
    experience: 7500,
    experienceToNext: 10000
  }}
  notificationCount={3}
/>
```

#### DashboardHeader Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  notificationCount
}) => {
  return (
    <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
            />
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-indigo-100">Level {user.level}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="secondary" size="sm" className="relative">
              <BellIcon className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Currency Display */}
        <div className="flex items-center space-x-6 mb-4">
          <div className="flex items-center space-x-2">
            <CoinIcon className="w-5 h-5 text-yellow-300" />
            <span className="font-semibold">{user.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <GemIcon className="w-5 h-5 text-cyan-300" />
            <span className="font-semibold">{user.gems}</span>
          </div>
        </div>

        {/* Experience Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Experience</span>
            <span>{user.experience} / {user.experienceToNext}</span>
          </div>
          <Progress
            value={(user.experience / user.experienceToNext) * 100}
            className="h-3 bg-indigo-400"
          />
        </div>
      </CardContent>
    </Card>
  );
};
```

#### QuickActionsGrid Component
```tsx
interface QuickAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  onClick: () => void;
}

export const QuickActionsGrid: React.FC<{ actions: QuickAction[] }> = ({ actions }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Card
          key={action.id}
          className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105"
          onClick={action.onClick}
        >
          <CardContent className="p-6 text-center">
            <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mx-auto mb-3`}>
              {action.icon}
            </div>
            <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
            <p className="text-xs text-gray-600">{action.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

### ActivityFeed Component
```tsx
interface ActivityItem {
  id: string;
  type: 'guild' | 'achievement' | 'system' | 'friend';
  title: string;
  description: string;
  timestamp: string;
  avatar?: string;
}

export const ActivityFeed: React.FC<{ items: ActivityItem[] }> = ({ items }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {item.avatar ? (
                  <img src={item.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <ActivityIcon className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <p className="text-xs text-gray-600">{item.description}</p>
                <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Mobile Responsiveness
- **Stack currency display** on mobile
- **Quick actions grid** adjusts from 4 columns to 2 columns
- **Activity feed** uses compact layout with smaller avatars
- **Touch targets** minimum 48px for mobile interaction

### Accessibility Considerations
- **Landmark regions** for screen reader navigation
- **Live regions** for activity feed updates
- **Color coding** supplemented with text indicators
- **Reduced motion** support for animations

---

## 3. Creator Analytics Dashboard

**Purpose**: Professional oversight tools for community creators and administrators

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Analytics Overview • Date   │
│ Range Selector • Export Options     │
├─────────────────────────────────────┤
│ Key Metrics Grid                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │Revenue  │ │Members  │ │Engage-  │ │
│ │         │ │         │ │ment     │ │
│ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────┤
│ Charts Section                      │
│ • Revenue Trend (Line Chart)        │
│ • Member Growth (Area Chart)        │
│ • Engagement Metrics (Bar Chart)   │
├─────────────────────────────────────┤
│ Top Performers Table                │
├─────────────────────────────────────┤
│ AI Insights Panel                   │
└─────────────────────────────────────┘
```

### Component Specifications

#### AnalyticsHeader Component
```typescript
interface AnalyticsHeaderProps {
  dateRange: {
    start: Date;
    end: Date;
  };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
  onExport: (format: 'csv' | 'pdf') => void;
}

// Usage Example
<AnalyticsHeader
  dateRange={{ start: new Date('2024-01-01'), end: new Date() }}
  onDateRangeChange={setDateRange}
  onExport={handleExport}
/>
```

#### MetricCard Component
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  change: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  format?: 'currency' | 'percentage' | 'number';
}

// Usage Example
<MetricCard
  title="Total Revenue"
  value={15420}
  change={{ value: 12.5, type: 'increase' }}
  icon={<DollarIcon />}
  format="currency"
/>
```

#### MetricCard Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { TrendingUp, TrendingDown } from "lucide-react";

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  format = 'number'
}) => {
  const formatValue = (val: string | number) => {
    switch (format) {
      case 'currency':
        return `$${Number(val).toLocaleString()}`;
      case 'percentage':
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const isPositive = change.type === 'increase';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-indigo-50 rounded-lg">
            {icon}
          </div>
          <div className={`flex items-center space-x-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{change.value}%</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold mb-1">
          {formatValue(value)}
        </h3>
        <p className="text-sm text-gray-600">{title}</p>
      </CardContent>
    </Card>
  );
};
```

#### ChartContainer Component
```tsx
interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  actions
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </CardContent>
    </Card>
  );
};
```

#### TopPerformersTable Component
```tsx
interface Performer {
  id: string;
  name: string;
  avatar: string;
  revenue: number;
  members: number;
  engagement: number;
  growth: number;
}

export const TopPerformersTable: React.FC<{ performers: Performer[] }> = ({ performers }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Communities</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Community</th>
                <th className="text-right py-3 px-4">Revenue</th>
                <th className="text-right py-3 px-4">Members</th>
                <th className="text-right py-3 px-4">Engagement</th>
                <th className="text-right py-3 px-4">Growth</th>
              </tr>
            </thead>
            <tbody>
              {performers.map((performer) => (
                <tr key={performer.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <img src={performer.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <span className="font-medium">{performer.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">
                    ${performer.revenue.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    {performer.members.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-4">
                    {performer.engagement}%
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={`inline-flex items-center space-x-1 ${
                      performer.growth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {performer.growth > 0 ? '↑' : '↓'}
                      <span>{Math.abs(performer.growth)}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
```

### AI Insights Panel
```tsx
interface Insight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AIInsightsPanel: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  const typeStyles = {
    opportunity: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    trend: 'bg-blue-50 border-blue-200',
    recommendation: 'bg-purple-50 border-purple-200'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${typeStyles[insight.type]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{insight.title}</h4>
                <span className="text-xs text-gray-500">
                  {insight.confidence}% confidence
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
              {insight.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={insight.action.onClick}
                >
                  {insight.action.label}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

### Mobile Responsiveness
- **Metric cards** stack vertically on mobile
- **Charts** become horizontally scrollable
- **Tables** with horizontal scrolling and simplified headers
- **AI insights** use compact cards with expandable details

### Accessibility Considerations
- **Chart accessibility** with ARIA labels and descriptions
- **Data table** proper headers and scope attributes
- **Color contrast** for metric changes (green/red)
- **Keyboard navigation** through all interactive elements

---

## 4. Quest System Interface

**Purpose**: Core engagement driver - gamified tasks and achievements

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Quest Progress • Filter Tabs │
│ ┌───────┬───────┬───────┬─────────┐ │
│ │Active │Daily │Weekly │Special  │ │
│ │Quests │Quests│Quests│Quests   │ │
│ └───────┴───────┴───────┴─────────┘ │
├─────────────────────────────────────┤
│ Quest Cards Grid                    │
│ ┌─────────────────────────────────┐ │
│ │ Quest Card 1 - Featured Quest  │ │
│ │ • Title • Description           │ │
│ │ • Rewards • Progress Bar        │ │
│ │ • Time Remaining • Difficulty   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Quest Categories Filter            │
│ • Battle • Collection • Social     │
│ • Exploration • Achievement       │
├─────────────────────────────────────┤
│ Completed Quests History           │
└─────────────────────────────────────┘
```

### Component Specifications

#### QuestCard Component
```typescript
interface QuestCardProps {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special' | 'achievement';
  category: 'battle' | 'collection' | 'social' | 'exploration';
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  rewards: {
    coins: number;
    gems?: number;
    experience: number;
    items?: string[];
  };
  progress: {
    current: number;
    total: number;
    requirement: string;
  };
  timeRemaining?: string;
  isCompleted?: boolean;
  isStarted?: boolean;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
}

// Usage Example
<QuestCard
  id="daily-battle-1"
  title="Daily Champion"
  description="Win 3 battles in the arena"
  type="daily"
  category="battle"
  difficulty="medium"
  rewards={{
    coins: 500,
    experience: 1000,
    items: ["Battle Shard"]
  }}
  progress={{
    current: 1,
    total: 3,
    requirement: "Battles won"
  }}
  timeRemaining="23h 45m"
  isStarted={true}
  onStart={handleStartQuest}
  onComplete={handleCompleteQuest}
/>
```

#### QuestCard Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const QuestCard: React.FC<QuestCardProps> = ({
  title,
  description,
  type,
  category,
  difficulty,
  rewards,
  progress,
  timeRemaining,
  isCompleted,
  isStarted,
  onStart,
  onComplete
}) => {
  const typeColors = {
    daily: 'bg-blue-100 text-blue-800',
    weekly: 'bg-purple-100 text-purple-800',
    special: 'bg-yellow-100 text-yellow-800',
    achievement: 'bg-green-100 text-green-800'
  };

  const difficultyColors = {
    easy: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    hard: 'bg-red-100 text-red-800',
    legendary: 'bg-yellow-100 text-yellow-800'
  };

  const progressPercentage = (progress.current / progress.total) * 100;

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${
      isCompleted ? 'border-green-500 bg-green-50' :
      isStarted ? 'border-blue-500 bg-blue-50' : ''
    }`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={typeColors[type]}>{type}</Badge>
              <Badge variant="outline" className={difficultyColors[difficulty]}>
                {difficulty}
              </Badge>
            </div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          {timeRemaining && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Time Remaining</p>
              <p className="text-sm font-medium text-red-600">{timeRemaining}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{progress.requirement}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Rewards */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Rewards</h4>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded">
              <CoinIcon className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">{rewards.coins}</span>
            </div>
            {rewards.gems && (
              <div className="flex items-center space-x-1 bg-cyan-50 px-2 py-1 rounded">
                <GemIcon className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium">{rewards.gems}</span>
              </div>
            )}
            <div className="flex items-center space-x-1 bg-purple-50 px-2 py-1 rounded">
              <ExperienceIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">{rewards.experience} XP</span>
            </div>
            {rewards.items?.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckIcon className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          ) : isStarted ? (
            <Button
              onClick={() => onComplete?.(id)}
              disabled={progress.current < progress.total}
            >
              Complete Quest
            </Button>
          ) : (
            <Button onClick={() => onStart?.(id)}>
              Start Quest
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

#### QuestFilterTabs Component
```tsx
interface QuestFilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    active: number;
    daily: number;
    weekly: number;
    special: number;
  };
}

export const QuestFilterTabs: React.FC<QuestFilterTabsProps> = ({
  activeTab,
  onTabChange,
  counts
}) => {
  const tabs = [
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'daily', label: 'Daily', count: counts.daily },
    { id: 'weekly', label: 'Weekly', count: counts.weekly },
    { id: 'special', label: 'Special', count: counts.special }
  ];

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
```

#### QuestCategoryFilter Component
```tsx
interface QuestCategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

export const QuestCategoryFilter: React.FC<QuestCategoryFilterProps> = ({
  selectedCategories,
  onCategoryChange
}) => {
  const categories = [
    { id: 'battle', label: 'Battle', icon: <SwordIcon /> },
    { id: 'collection', label: 'Collection', icon: <CollectionIcon /> },
    { id: 'social', label: 'Social', icon: <UsersIcon /> },
    { id: 'exploration', label: 'Exploration', icon: <CompassIcon /> },
    { id: 'achievement', label: 'Achievement', icon: <TrophyIcon /> }
  ];

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onCategoryChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onCategoryChange([...selectedCategories, categoryId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => toggleCategory(category.id)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            selectedCategories.includes(category.id)
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {category.icon}
          <span className="text-sm font-medium">{category.label}</span>
        </button>
      ))}
    </div>
  );
};
```

### Mobile Responsiveness
- **Quest cards** stack vertically with compact layout
- **Filter tabs** become horizontally scrollable
- **Category filters** wrap to multiple lines
- **Progress bars** optimized for touch interaction

### Accessibility Considerations
- **Quest status** clearly indicated with color and text
- **Time remaining** announced for screen readers
- **Reward information** structured with proper headings
- **Filter state** clearly communicated

---

## 5. Character Profile

**Purpose**: User progression and achievement showcase - personal gaming hub

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Character Info • Edit Button │
├─────────────────────────────────────┤
│ Character Stats Overview             │
│ • Level Progress • Total Play Time  │
│ • Achievement Unlocks               │
├─────────────────────────────────────┤
│ Equipment & Inventory Grid          │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │Weapon│Armor │Trinket│Quest │   │
│ │ Slot │ Slot │ Slot  │ Items│   │
│ └─────┘ └─────┘ └─────┘ └─────┘   │
├─────────────────────────────────────┤
│ Skills & Abilities Tree             │
│ • Combat Skills                    │
│ • Magic Abilities                  │
│ • Passive Buffs                    │
├─────────────────────────────────────┤
│ Achievement Showcase                │
│ • Recent Achievements              │
│ • Rare Achievements                │
│ • Progress Tracking               │
├─────────────────────────────────────┤
│ Activity Timeline                  │
└─────────────────────────────────────┘
```

### Component Specifications

#### CharacterProfileHeader Component
```typescript
interface CharacterProfileHeaderProps {
  character: {
    name: string;
    class: 'warrior' | 'mage' | 'rogue' | 'paladin';
    level: number;
    avatar: string;
    title?: string;
    guild?: {
      name: string;
      role: string;
    };
  };
  onEdit: () => void;
}

// Usage Example
<CharacterProfileHeader
  character={{
    name: "Aldric the Brave",
    class: "warrior",
    level: 25,
    avatar: "/avatars/warrior-1.png",
    title: "Dragon Slayer",
    guild: {
      name: "Legends Guild",
      role: "Officer"
    }
  }}
  onEdit={handleEditProfile}
/>
```

#### CharacterProfileHeader Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const CharacterProfileHeader: React.FC<CharacterProfileHeaderProps> = ({
  character,
  onEdit
}) => {
  const classColors = {
    warrior: 'bg-red-100 text-red-800',
    mage: 'bg-blue-100 text-blue-800',
    rogue: 'bg-green-100 text-green-800',
    paladin: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={character.avatar}
                alt={character.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 bg-white text-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-indigo-500">
                {character.level}
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{character.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={classColors[character.class]}>
                  {character.class}
                </Badge>
                {character.title && (
                  <Badge variant="outline" className="border-white text-white">
                    {character.title}
                  </Badge>
                )}
              </div>
              {character.guild && (
                <p className="text-indigo-100 text-sm mt-1">
                  {character.guild.name} • {character.guild.role}
                </p>
              )}
            </div>
          </div>
          <Button variant="secondary" onClick={onEdit}>
            <EditIcon className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### EquipmentSlot Component
```typescript
interface EquipmentSlotProps {
  type: 'weapon' | 'armor' | 'trinket' | 'quest';
  item?: {
    name: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    icon: string;
    level: number;
  };
  isEmpty?: boolean;
  onEquip?: () => void;
  onUnequip?: () => void;
}

// Usage Example
<EquipmentSlot
  type="weapon"
  item={{
    name: "Flame Sword",
    rarity: "epic",
    icon: "/items/flame-sword.png",
    level: 20
  }}
  onEquip={handleEquip}
  onUnequip={handleUnequip}
/>
```

#### EquipmentSlot Implementation
```tsx
import { Card, CardContent } from "@whop/react/components";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  type,
  item,
  isEmpty,
  onEquip,
  onUnequip
}) => {
  const slotIcons = {
    weapon: <SwordIcon className="w-6 h-6" />,
    armor: <ShieldIcon className="w-6 h-6" />,
    trinket: <GemIcon className="w-6 h-6" />,
    quest: <ScrollIcon className="w-6 h-6" />
  };

  const rarityColors = {
    common: 'border-gray-300 bg-gray-50',
    rare: 'border-blue-300 bg-blue-50',
    epic: 'border-purple-300 bg-purple-50',
    legendary: 'border-yellow-300 bg-yellow-50'
  };

  return (
    <Card className={`h-32 ${item ? rarityColors[item.rarity] : 'border-gray-200 bg-gray-50'}`}>
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-600">
            {slotIcons[type]}
          </div>
          <span className="text-xs text-gray-500 capitalize">{type}</span>
        </div>

        {item ? (
          <div className="flex-1 flex flex-col justify-between">
            <div className="text-center">
              <img
                src={item.icon}
                alt={item.name}
                className="w-8 h-8 mx-auto mb-1"
              />
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-xs text-gray-500">Lvl {item.level}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onUnequip}
              className="text-xs"
            >
              Unequip
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEquip}
              className="text-gray-400 hover:text-gray-600"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

#### SkillTree Component
```typescript
interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  isUnlocked: boolean;
  prerequisites?: string[];
  position: { x: number; y: number };
}

interface SkillTreeProps {
  skills: SkillNode[];
  onSkillUpgrade: (skillId: string) => void;
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  skills,
  onSkillUpgrade
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Skills & Abilities</h3>
        <div className="relative bg-gray-50 rounded-lg p-4" style={{ minHeight: '400px' }}>
          {skills.map((skill) => (
            <div
              key={skill.id}
              className={`absolute w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 ${
                skill.isUnlocked
                  ? skill.level === skill.maxLevel
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 bg-gray-100'
              }`}
              style={{
                left: `${skill.position.x}%`,
                top: `${skill.position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => skill.isUnlocked && onSkillUpgrade(skill.id)}
            >
              <img src={skill.icon} alt={skill.name} className="w-8 h-8" />
              <span className="text-xs font-medium text-center mt-1">
                {skill.level}/{skill.maxLevel}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

#### AchievementShowcase Component
```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
  progress?: {
    current: number;
    total: number;
  };
}

export const AchievementShowcase: React.FC<{ achievements: Achievement[] }> = ({
  achievements
}) => {
  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const inProgressAchievements = achievements.filter(a => !a.unlockedAt && a.progress);

  return (
    <div className="space-y-6">
      {/* Recent Achievements */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Achievements</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {unlockedAchievements.slice(0, 4).map((achievement) => (
              <div key={achievement.id} className="text-center">
                <div className="relative mb-2">
                  <img
                    src={achievement.icon}
                    alt={achievement.title}
                    className="w-16 h-16 mx-auto rounded-full border-4 border-yellow-400"
                  />
                  <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center">
                    <StarIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm font-medium">{achievement.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(achievement.unlockedAt!).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* In Progress */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">In Progress</h3>
          <div className="space-y-3">
            {inProgressAchievements.map((achievement) => (
              <div key={achievement.id} className="flex items-center space-x-3">
                <img
                  src={achievement.icon}
                  alt={achievement.title}
                  className="w-12 h-12 rounded-full border-2 border-gray-300"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{achievement.title}</h4>
                  <p className="text-xs text-gray-600 mb-1">{achievement.description}</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(achievement.progress!.current / achievement.progress!.total) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {achievement.progress!.current}/{achievement.progress!.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### Mobile Responsiveness
- **Equipment grid** reduces from 4 to 2 columns on mobile
- **Skill tree** becomes scrollable with zoom controls
- **Achievement showcase** uses compact cards
- **Character header** stacks elements vertically

### Accessibility Considerations
- **Equipment slots** clear empty/equipped state indication
- **Skill tree** keyboard navigation with arrow keys
- **Achievement progress** announced to screen readers
- **Character stats** structured with proper headings

---

## Implementation Guidelines

### File Structure
```
src/
├── components/
│   ├── ui/
│   │   ├── character-card.tsx
│   │   ├── dashboard-header.tsx
│   │   ├── metric-card.tsx
│   │   ├── quest-card.tsx
│   │   ├── equipment-slot.tsx
│   │   └── skill-tree.tsx
│   ├── screens/
│   │   ├── character-selection.tsx
│   │   ├── dashboard.tsx
│   │   ├── analytics.tsx
│   │   ├── quests.tsx
│   │   └── profile.tsx
│   └── layout/
│       ├── navigation.tsx
│       └── footer.tsx
├── hooks/
│   ├── use-character-selection.ts
│   ├── use-quest-progress.ts
│   ├── use-analytics.ts
│   └── use-skill-tree.ts
├── utils/
│   ├── animation.ts
│   ├── accessibility.ts
│   └── responsive.ts
└── types/
    ├── character.ts
    ├── quest.ts
    ├── analytics.ts
    └── achievement.ts
```

### Animation Guidelines
- **Spring physics** for card interactions
- **Stagger animations** for grid layouts
- **Smooth transitions** for progress bars
- **Micro-interactions** for button states

### Performance Considerations
- **Virtual scrolling** for large lists
- **Lazy loading** for images and components
- **Debounced input** for search/filter
- **Optimized re-renders** with React.memo

### Testing Strategy
- **Component tests** for all interactive elements
- **Accessibility audits** with axe-core
- **Performance testing** with Lighthouse
- **User testing** for core flows

---

## Conclusion

These wireframes provide a comprehensive design system for Whop Legends that balances game-like engagement with professional functionality. The Frosted UI components create a modern, accessible interface that works seamlessly across all devices while maintaining the gamified experience that drives user engagement.

The designs prioritize:
1. **User Experience**: Intuitive navigation and clear visual hierarchy
2. **Accessibility**: WCAG-compliant design with proper contrast and screen reader support
3. **Performance**: Optimized for fast loading and smooth interactions
4. **Scalability**: Component-based architecture for easy maintenance and expansion

Next steps should include prototyping key interactions and user testing to validate the design decisions before full implementation.