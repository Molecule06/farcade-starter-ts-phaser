# Tailwind CSS v4 Migration Plan

## 🎯 Migration Goal
Complete 1:1 conversion from styled-components to Tailwind CSS v4 with **ZERO VISUAL CHANGES**.

## 📊 Migration Statistics
- **Total Files**: 15 styled component files
- **Total Lines**: ~2,456 lines of styled-components code
- **Theme Properties**: 79 design tokens
- **Dynamic Props**: 32+ instances
- **Keyframe Animations**: 4 unique animations
- **Media Queries**: 12 responsive breakpoints

## 🎨 Styling Philosophy
- **Tailwind First**: Use Tailwind CSS v4 for everything it can handle (99% of cases)
- **Global Styles Fallback**: Use a global stylesheet only for truly complex patterns that Tailwind cannot handle
- **Readability**: Use template literals with one-class-per-line for components with 5+ classes
- **Maintainability**: Favor clarity and developer experience over brevity

---

## 🏗️ Phase 1: Infrastructure Setup

### [ ] 1.1 Install Tailwind CSS v4
```bash
npm install tailwindcss@next @tailwindcss/vite@next
```

### [ ] 1.2 Configure Theme with @theme Directive
Map existing theme to Tailwind v4 using CSS variables (NO config file needed!):
```css
/* app.css or index.css */
@import "tailwindcss";

@theme {
  /* Colors - Background */
  --color-bg-primary: #0f0f0f;
  --color-bg-secondary: #1a1a1a;
  --color-bg-tertiary: #242424;
  --color-bg-overlay: rgba(15, 15, 15, 0.95);
  
  /* Colors - Accent */
  --color-accent-green: #b7ff00;
  --color-accent-green-hover: #9fe600;
  --color-accent-green-light: rgba(183, 255, 0, 0.1);
  
  /* Colors - Status */
  --color-status-red: #ef4444;
  --color-status-yellow: #eab308;
  --color-status-green: #22c55e;
  --color-status-blue: #3b82f6;
  
  /* Colors - Text */
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #9b9b9b;
  --color-text-inverse: #0f0f0f;
  
  /* Colors - Border */
  --color-border-default: #2a2a2a;
  --color-border-light: #3a3a3a;
  --color-border-dark: #1a1a1a;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;
  
  /* Border Radius */
  --radius-xs: 4px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  /* Font Sizes */
  --text-xs: 10px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-xxl: 24px;
  
  /* Font Weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Animations - Duration */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.25);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);
  
  /* Z-Index */
  --z-base: 0;
  --z-dropdown: 100;
  --z-overlay: 200;
  --z-modal: 300;
  --z-tooltip: 400;
  --z-notification: 500;
}

/* Keyframe animations (these go outside @theme) */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUpBanner {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### [ ] 1.3 Create Global Stylesheet (For Edge Cases Only)
For the rare patterns that Tailwind truly cannot handle:
```css
/* globals.css */
@layer base {
  :root {
    /* Dynamic runtime values */
    --background-pattern-opacity: 0.08;
    --dynamic-width: 0;
    --dynamic-height: 0;
  }
  
  /* Complex background patterns that require data URIs */
  .game-container-pattern::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/png;base64,iVBORw0K...");
    background-size: 150px 150px;
    background-repeat: repeat;
    opacity: 0;
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 0;
  }
  
  /* Only add styles here if Tailwind absolutely cannot handle them */
}
```

### [ ] 1.4 Create Utility Helper Functions
```typescript
// utils/tw.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// For readable multi-line class lists
export function tw(strings: TemplateStringsArray, ...values: any[]) {
  const fullString = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '')
  }, '')
  
  return fullString
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
}
```

---

## 📦 Phase 2: Component Migration Checklist

### Layout Components

#### [x] 2.1 Container.styled.ts → Container.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/Container.styled.ts` (DELETED)
**Components**: 
- [x] RemixDevContainer
- [x] MainContentWrapper  
- [x] BuildPanelSpacer
- [x] BackgroundPatternStyle (moved to global CSS)
- [x] MobileStyles (moved to global CSS)

**Caveats**:
- ⚠️ Dynamic `$buildPanelOpen` prop needs conditional classes
- ⚠️ Media query styles need responsive utilities
- ⚠️ `<style>` components need extraction to CSS

**Migration**:
```tsx
// Before: <RemixDevContainer $buildPanelOpen={isOpen}>

// After: Using template literal for readability (7 classes)
<div className={cn(tw`
  fixed inset-0
  bg-bg-primary
  font-sans
  flex flex-col
  z-[1000000]
`, isOpen && "build-panel-open")}>
```

#### [x] 2.2 GameContainer.styled.ts → GameContainer.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/GameContainer.styled.ts` (DELETED)
**Components**:
- [x] GameContainerWrapper
- [x] GameFrame

**Caveats**:
- ⚠️ Complex background image with SVG data URI
- ⚠️ Dynamic width/height props ($width, $height)
- ⚠️ Pseudo-element ::before for pattern overlay
- ⚠️ Conditional opacity based on body class

**Migration**:
```tsx
// Dynamic dimensions via style prop (Tailwind can't handle runtime values)
// Note: Complex background pattern moved to global CSS as .game-container-pattern
<div 
  style={{ width: `${width}px`, height: `${height}px` }} 
  className={tw`
    game-container-pattern
    relative
    transition-[width,height] duration-300 ease-in-out
    overflow-hidden
    rounded-xl
    border-2 border-[#99999905]
  `}>
```

#### [x] 2.3 StatusBar.styled.ts → StatusBar.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/StatusBar.styled.ts` (DELETED)
**Components**:
- [x] StatusBarWrapper
- [x] StatusCenter
- [x] SizeToggleGroup
- [x] SizeToggleOption
- [x] PublishableStatus
- [x] StatusPanel
- [x] StatusPanelItem
- [x] EventLight
- [x] UpdatedText
- [x] StatusLightGrid
- [x] StatusLeftWrapper

**Caveats**:
- ⚠️ Dynamic `$isActive` prop for SizeToggleOption
- ⚠️ Dynamic `$show` prop for StatusPanel
- ⚠️ Dynamic `$color` prop for EventLight
- ⚠️ Media queries for responsive text

**Migration**:
```tsx
// SizeToggleOption with active state (13 classes - using template literal)
<button className={cn(tw`
  bg-transparent
  text-[#aaa]
  border-none
  px-3.5 py-1.5
  text-xs font-semibold
  cursor-pointer
  transition-all duration-200 ease-in-out
  select-none
  relative
  min-w-[44px]
  hover:bg-white/[0.08]
  hover:text-[#ccc]
`, isActive && tw`
  bg-white/[0.15]
  text-white
  hover:bg-white/[0.2]
`)}>
```

#### [x] 2.4 StatusLeft.styled.ts → StatusLeft.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/StatusLeft.styled.ts` (DELETED)
**Components**:
- [x] StatusLeftWrapper
- [x] StatusButton
- [x] StatusLightGrid
- [x] StatusPanel
- [x] StatusLabel

**Caveats**:
- ⚠️ Heavy theme usage (currently causing TS errors)
- ⚠️ fadeIn animation keyframe
- ⚠️ Dynamic $isOpen prop
- ⚠️ Nested theme property access

**Migration**:
```tsx
// Remove theme dependencies, use Tailwind classes directly (12 classes)
<button className={tw`
  flex items-center
  gap-sm
  px-xs py-xs
  bg-transparent
  text-text-secondary text-sm
  rounded-sm
  transition-all duration-fast
  hover:bg-bg-tertiary hover:text-text-primary
  focus-visible:outline-2 focus-visible:outline-accent-green focus-visible:outline-offset-2
  active:scale-[0.98]
`}>
```

#### [x] 2.5 StatusRight.styled.ts → StatusRight.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/StatusRight.styled.ts` (DELETED)
**Components**:
- [x] StatusRightWrapper
- [x] BuildToggleButton
- [x] SettingsContainer
- [x] SettingsButton
- [x] SettingsPanel
- [x] QrPanel
- [x] StatusItem
- [x] SettingLabel
- [x] SettingCheckbox
- [x] SettingText

**Caveats**:
- ⚠️ Dynamic `$isActive` prop for BuildToggleButton
- ⚠️ Dynamic `$isOpen` prop for panels
- ⚠️ Custom checkbox styling with ::after pseudo-element
- ⚠️ Disabled state styling

**Migration**:
```tsx
// Custom checkbox needs appearance-none and pseudo-elements (20+ classes)
<input type="checkbox" className={tw`
  appearance-none
  w-9 h-5
  bg-[#333]
  border-2 border-[#555]
  rounded-full
  cursor-pointer
  relative
  transition-all duration-200
  checked:bg-status-green
  checked:border-status-green
  after:content-['']
  after:absolute
  after:top-0.5 after:left-0.5
  after:w-3 after:h-3
  after:bg-white
  after:rounded-full
  after:transition-all after:duration-200
  after:shadow-sm
  checked:after:translate-x-4
  checked:after:bg-black
  disabled:opacity-50
  disabled:cursor-not-allowed
`}>
```

#### [x] 2.6 TopNavBar.styled.ts → TopNavBar.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/TopNavBar.styled.ts` (DELETED)
**Components**:
- [x] TopNavBarWrapper
- [x] NavLeft
- [x] NavButton
- [x] NavMuteButton
- [x] NavIcon

**Caveats**:
- ⚠️ Pointer-events management
- ⚠️ Dynamic `$disabled` and `$isMuted` props
- ⚠️ SVG icon sizing and shadows

**Migration**:
```tsx
// TopNavBar with nested button pointer-events (9 classes)
<div className={tw`
  absolute top-0 left-0 right-0
  z-40
  px-4 pt-1 pb-3
  flex justify-between items-center
  pointer-events-none
  [&_button]:pointer-events-auto
`}>
```

### Panel Components

#### [ ] 2.7 BuildPanel.styled.ts → BuildPanel.tsx
**File**: `.remix/components/Panels/BuildPanel.styled.ts`
**Components**:
- [ ] BuildPanelWrapper
- [ ] BuildPanelContent
- [ ] BuildControls
- [ ] BuildButton
- [ ] BuildButtonText
- [ ] BuildSpinner
- [ ] BuildButtonMessage
- [ ] SDKWarning
- [ ] WarningIcon
- [ ] WarningContent
- [ ] BuildSuccess
- [ ] SuccessIcon
- [ ] SuccessContent
- [ ] BuildInfo
- [ ] BuildOutput
- [ ] BuildOutputHeader
- [ ] BuildOutputTitle
- [ ] BuildTimeAgo
- [ ] BuildOutputActions
- [ ] FileSize
- [ ] BuildOutputCode
- [ ] CopyButton
- [ ] CodeDisplay

**Caveats**:
- ⚠️ Spin animation keyframe
- ⚠️ Dynamic `$isOpen`, `$isBuilding`, `$isComplete`, `$copied` props
- ⚠️ Complex gradient backgrounds
- ⚠️ Conditional transform and transitions

**Migration**:
```tsx
// Spin animation using Tailwind's animate-spin
<div className={cn(tw`
  w-4 h-4
  border-2 border-white/30 border-t-white
  rounded-full
  animate-spin
`, !visible && "hidden")}>

// Gradient button (18+ classes - definitely needs template literal!)
<button className={tw`
  flex items-center justify-center
  gap-2
  px-6 py-4
  bg-gradient-to-br from-status-green to-[#16a34a]
  text-white
  border-none
  rounded-md
  text-base font-semibold
  cursor-pointer
  transition-all duration-200
  relative
  min-h-[52px]
  hover:from-[#16a34a] hover:to-[#15803d]
  hover:-translate-y-px
  hover:shadow-[0_4px_12px_rgba(34,197,94,0.3)]
  disabled:!bg-[#6b7280]
  disabled:!text-[#9ca3af]
  disabled:cursor-not-allowed
  disabled:transform-none
  disabled:shadow-none
`}>
```

#### [ ] 2.8 PerformancePanel.styled.ts → PerformancePanel.tsx
**File**: `.remix/components/Panels/PerformancePanel.styled.ts`
**Components**:
- [ ] PerformancePanelWrapper
- [ ] PerformancePanelHeader
- [ ] PerformanceTier
- [ ] TierBadge
- [ ] PanelCloseButton
- [ ] PerformanceSection
- [ ] PerformanceSectionHeader
- [ ] PerformanceSparklineContainer
- [ ] PerformanceStatsGrid
- [ ] PerformanceStat
- [ ] PerformanceStatLabel
- [ ] PerformanceStatValue
- [ ] PerformanceTimingGrid
- [ ] PerformanceTimingItem
- [ ] PerformanceTimingLabel
- [ ] PerformanceTimingValue
- [ ] PerformanceMemoryGrid
- [ ] PerformanceMemoryItem
- [ ] PerformanceMemoryLabel
- [ ] PerformanceMemoryValue
- [ ] PerformanceRenderingGrid
- [ ] PerformanceRenderingItem
- [ ] PerformanceRenderingLabel
- [ ] PerformanceRenderingValue
- [ ] PerformanceQuality
- [ ] PerformanceQualityItem
- [ ] PerformanceQualityLabel
- [ ] PerformanceQualityStatus
- [ ] PerformanceQualityValue
- [ ] PerformanceFooter
- [ ] PerformanceDataSource
- [ ] PerformanceDataSourceLabel
- [ ] PerformanceDataSourceValue
- [ ] PerformanceMonitoringStatus
- [ ] MonitoringIndicator

**Caveats**:
- ⚠️ Dynamic `$show`, `$tier`, `$status`, `$active` props
- ⚠️ Backdrop filter blur
- ⚠️ Complex conditional styling for badges

**Migration**:
```tsx
// Panel with backdrop blur (16+ classes)
<div className={cn(tw`
  absolute bottom-full left-1/2
  -translate-x-1/2 translate-y-2.5
  mb-2
  bg-[#1f1f1f]
  border border-white/10
  rounded-md
  p-4
  min-w-[220px] max-w-[260px]
  opacity-0
  pointer-events-none
  transition-all duration-200
  shadow-[0_8px_24px_rgba(0,0,0,0.4)]
  select-none
  z-[600]
  backdrop-blur-md
`, show && tw`
  opacity-100
  translate-y-0
  pointer-events-auto
`)}>
```

#### [ ] 2.9 SettingsPanel.styled.ts → SettingsPanel.tsx
**File**: `.remix/components/Panels/SettingsPanel.styled.ts`
**Components**:
- [ ] SettingsPanelWrapper
- [ ] SettingsPanelHeader
- [ ] PanelCloseButton
- [ ] StatusItem
- [ ] StatusLabel
- [ ] DeviceInfo
- [ ] DeviceInfoItem
- [ ] DeviceInfoLabel
- [ ] DeviceInfoValue
- [ ] SettingRow
- [ ] SettingInfo
- [ ] SettingName
- [ ] SettingDescription
- [ ] SettingRestriction
- [ ] SettingControl
- [ ] ToggleSwitch
- [ ] ToggleSlider
- [ ] CompatibilityNotes
- [ ] CompatibilityNote
- [ ] SettingsActions
- [ ] SettingsResetButton

**Caveats**:
- ⚠️ Custom toggle switch implementation
- ⚠️ Dynamic class names for compatibility notes
- ⚠️ Complex nested styling

**Migration**:
```tsx
// Custom toggle switch using peer modifier (20+ classes)
<label className={tw`
  relative
  inline-block
  w-9 h-5
  cursor-pointer
`}>
  <input type="checkbox" className={tw`
    opacity-0
    w-0 h-0
    peer
  `}>
  <span className={tw`
    absolute
    cursor-pointer
    inset-0
    bg-[#333]
    border-2 border-[#555]
    rounded-full
    transition-all duration-200
    before:content-['']
    before:absolute
    before:top-0.5 before:left-0.5
    before:w-3 before:h-3
    before:bg-white
    before:rounded-full
    before:transition-all before:duration-200
    before:shadow-sm
    peer-checked:bg-status-green
    peer-checked:border-status-green
    peer-checked:before:translate-x-4
    peer-checked:before:bg-black
    peer-disabled:opacity-50
    peer-disabled:cursor-not-allowed
    peer-disabled:border-[#333]
  `}>
</label>
```

### Chart Components

#### [x] 2.10 PerformanceChart.styled.ts (Layout) → PerformanceChart.tsx ✅ COMPLETED
**File**: `.remix/components/Layout/PerformanceChart.styled.ts` (DELETED)
**Components**:
- [x] PerformanceChartContainer
- [x] PerformanceChartCanvas
- [x] PerformancePanel
- [x] PerformanceStats
- [x] PerfSection
- [x] PerfHeader
- [x] PerfContent
- [x] PerfChart
- [x] PerfData
- [x] PerfRow
- [x] PerfValue
- [x] PerfUnit
- [x] PerfRange
- [x] PerfLabel

**Caveats**:
- ⚠️ fadeIn animation
- ⚠️ Dynamic `$isOpen` prop with animation
- ⚠️ Theme property access

**Migration**:
```tsx
// Panel with conditional animation
<div className={cn(
  "absolute bottom-full left-1/2 -translate-x-1/2 mb-sm bg-bg-secondary border border-border-default rounded-md p-lg min-w-[320px] shadow-xl z-dropdown hidden",
  isOpen && "block animate-fade-in"
)}>
```

#### [ ] 2.11 PerformanceChart.styled.ts (Performance) → PerformanceChart.tsx
**File**: `.remix/components/Performance/PerformanceChart.styled.ts`
**Components**:
- [ ] PerformanceChartContainer
- [ ] PerformanceChart
- [ ] PerformancePanel
- [ ] PerformanceStats
- [ ] PerfSection
- [ ] PerfHeader
- [ ] PerfContent
- [ ] PerfChart
- [ ] PerfData
- [ ] PerfRow
- [ ] PerfValue
- [ ] PerfUnit
- [ ] PerfRange

**Caveats**:
- ⚠️ Direct CSS port with specific pixel values
- ⚠️ Dynamic `$show` prop
- ⚠️ Media queries for responsive font sizes

**Migration**:
```tsx
// Direct port maintaining exact styling
<canvas className="border border-white/10 rounded cursor-pointer transition-all duration-200 bg-[rgba(26,26,26,0.8)] hover:border-white/20">
```

### Overlay Components

#### [ ] 2.12 GameOverlay.styled.ts → GameOverlay.tsx
**File**: `.remix/components/Game/GameOverlay.styled.ts`
**Components**:
- [ ] GameOverlayWrapper
- [ ] OverlayContent
- [ ] OverlayScore
- [ ] OverlayTitle
- [ ] OverlayButtonContainer
- [ ] PlayAgainButton
- [ ] PlayIcon
- [ ] GameFrame
- [ ] GameIframe

**Caveats**:
- ⚠️ Dynamic `$show` prop
- ⚠️ Backdrop filter blur
- ⚠️ Clamp functions for responsive text
- ⚠️ Focus-visible ring styling

**Migration**:
```tsx
// Responsive text with clamp
<div className="text-[clamp(48px,18cqw,144px)] font-extrabold uppercase mb-3 text-white leading-none tracking-tight">

// Button with ring on focus
<button className="flex items-center justify-center gap-2 bg-accent-green text-black border-0 rounded-md px-4 py-3 mx-4 h-[42px] text-sm font-semibold cursor-pointer transition-all duration-200 outline-none select-none hover:bg-[#a7f200] active:bg-[#95df00] focus-visible:ring-[3px] focus-visible:ring-accent-green/50 focus-visible:border-accent-green">
```

#### [ ] 2.13 SetupBanner.styled.ts → SetupBanner.tsx
**File**: `.remix/components/Layout/SetupBanner.styled.ts`
**Components**:
- [ ] SetupBannerWrapper
- [ ] SetupBannerContent
- [ ] SetupBannerIcon
- [ ] SetupBannerText
- [ ] SetupBannerClose

**Caveats**:
- ⚠️ slideUpBanner animation
- ⚠️ Linear gradient background
- ⚠️ Code block styling within text

**Migration**:
```tsx
// Banner with slide animation
<div className="absolute bottom-0 left-0 right-0 z-[100] bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-black font-sans shadow-[0_-2px_8px_rgba(0,0,0,0.3)] animate-slide-up-banner">

// Code block within text
<code className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-[13px] font-medium">
```

### Common Components

#### [ ] 2.14 ErrorBoundary.styled.ts → ErrorBoundary.tsx
**File**: `.remix/components/Common/ErrorBoundary.styled.ts`
**Components**:
- [ ] ErrorBoundaryContainer
- [ ] ErrorBoundaryContent
- [ ] ErrorBoundaryIcon
- [ ] ErrorBoundaryTitle
- [ ] ErrorBoundaryMessage
- [ ] ErrorBoundaryDetails
- [ ] ErrorBoundaryError
- [ ] ErrorName
- [ ] ErrorMessage
- [ ] ErrorStack
- [ ] ErrorBoundaryActions
- [ ] ErrorBoundaryButton
- [ ] ErrorBoundaryRetry
- [ ] ErrorBoundaryReload
- [ ] PerformanceError
- [ ] PerformanceErrorContent
- [ ] PerformanceErrorRetry
- [ ] BuildPanelError
- [ ] BuildPanelErrorContent
- [ ] BuildPanelErrorRetry
- [ ] SettingsPanelError
- [ ] SettingsPanelErrorContent
- [ ] SettingsPanelErrorRetry

**Caveats**:
- ⚠️ Multiple specialized error components
- ⚠️ Extended component inheritance pattern
- ⚠️ Complex nesting of error states

**Migration**:
```tsx
// Base error container
<div className="flex items-center justify-center min-h-[200px] p-6 bg-status-red/5 border border-status-red/20 rounded-md m-4">

// Specialized error components need composition
const PerformanceError = ({ children }) => (
  <div className="p-3 bg-status-red/5 border border-status-red/20 rounded-md">
    {children}
  </div>
)
```

#### [ ] 2.15 StatusIndicator.styled.ts → StatusIndicator.tsx
**File**: `.remix/components/Common/StatusIndicator.styled.ts`
**Components**:
- [ ] StatusItem
- [ ] EventLight
- [ ] StatusLightMini

**Caveats**:
- ⚠️ Dynamic `$status` prop for lights
- ⚠️ Conditional shadow effects
- ⚠️ Different sizes for indicators

**Migration**:
```tsx
// Status light with conditional shadow
<div className={cn(
  "w-2 h-2 rounded-full transition-all duration-300 shrink-0",
  status ? "bg-status-green shadow-[0_0_4px_rgba(34,197,94,0.6)]" 
         : "bg-status-red shadow-[0_0_4px_rgba(239,68,68,0.6)]"
)}>
```

---

## 🎨 Phase 3: Global Styles Migration

### [ ] 3.1 GlobalStyles.tsx → globals.css
**File**: `.remix/styles/GlobalStyles.tsx`

**Key Migrations**:
- [ ] CSS custom properties (already defined)
- [ ] Global resets
- [ ] Body styles
- [ ] Canvas styles
- [ ] Status bar specific styles
- [ ] Button/link/input defaults
- [ ] Scrollbar styling

**Caveats**:
- ⚠️ Important flags in status bar styles
- ⚠️ Webkit-specific properties
- ⚠️ Focus-visible states

### [ ] 3.2 GameStyles.ts → game.css
**File**: `.remix/styles/GameStyles.ts`

**Simple migration** - just HTML/body/canvas resets

---

## 🛠️ Phase 4: Utility Patterns

### Dynamic Props Mapping

| styled-components | Tailwind Approach |
|-------------------|-------------------|
| `$isOpen` | Conditional classes with `cn()` |
| `$width/$height` | Inline styles or CSS custom properties |
| `$status` | Conditional classes |
| `$color` | Variant classes or data attributes |
| `$isActive` | Conditional classes |
| `$show` | Conditional classes |
| `$tier` | Variant mapping |
| `$copied` | Temporary state classes |

### Animation Replacements

| styled-components | Tailwind Class |
|-------------------|----------------|
| `spin` keyframe | `animate-spin` |
| `fadeIn` keyframe | `animate-fade-in` (custom) |
| `slideUpBanner` | `animate-slide-up-banner` (custom) |

### Theme Access Pattern

```tsx
// Before: ${props => props.theme.colors.bg.primary}
// After: Use Tailwind class: bg-bg-primary

// For dynamic theme values:
// Use CSS custom properties as fallback
```

---

## 📋 Migration Progress Tracker

### Component Groups Progress
- [x] **Layout** (7 files) - 7/7 complete ✅ DONE
- [ ] **Panels** (3 files) - 0/3 complete  
- [ ] **Charts** (2 files) - 1/2 complete
- [ ] **Overlays** (2 files) - 0/2 complete
- [ ] **Common** (2 files) - 0/2 complete
- [ ] **Global Styles** (2 files) - 0/2 complete

### Overall Progress
- **Components Migrated**: 50/79 (Layout Components Complete)
- **Lines Converted**: ~1,200/2,456 (Layout Components Complete)
- **Dynamic Props Handled**: 15/32 (Layout Components Complete)
- **Animations Converted**: 1/4 (fadeIn animation handled)

---

## 💡 Template Literal Pattern Examples

### Simple Component (< 5 classes)
```tsx
// Inline is fine for simple components
<div className="flex items-center gap-2 text-sm">
```

### Medium Component (5-10 classes)
```tsx
// Start using template literals for readability
<button className={tw`
  flex items-center justify-center
  px-4 py-2
  bg-accent-green text-black
  rounded-md
  hover:bg-accent-green-hover
  transition-colors duration-fast
`}>
```

### Complex Component (10+ classes with conditions)
```tsx
// Template literals with conditional classes
<div className={cn(tw`
  absolute bottom-full left-1/2
  -translate-x-1/2
  bg-bg-secondary
  border border-border-default
  rounded-md
  p-4
  shadow-xl
  transition-all duration-normal
  
  /* Base state */
  opacity-0
  pointer-events-none
  translate-y-2
`, 
  /* Conditional states */
  isOpen && tw`
    opacity-100
    pointer-events-auto
    translate-y-0
  `,
  hasError && tw`
    border-status-red
    bg-status-red/10
  `
)}>
```

### Component with Variants
```tsx
// Using a variant map for multiple states
const variantStyles = {
  primary: tw`
    bg-accent-green
    text-black
    hover:bg-accent-green-hover
  `,
  secondary: tw`
    bg-bg-secondary
    text-text-primary
    border border-border-default
    hover:bg-bg-tertiary
  `,
  danger: tw`
    bg-status-red
    text-white
    hover:bg-status-red/80
  `
}

<button className={cn(tw`
  px-4 py-2
  rounded-md
  transition-colors duration-fast
  font-medium
`, variantStyles[variant])}>
```

## ✅ Validation Checklist

For each component migration:
1. [ ] Visual regression test passed
2. [ ] All hover/focus states work
3. [ ] Animations perform identically
4. [ ] Responsive behavior maintained
5. [ ] Dark mode support (if applicable)
6. [ ] No TypeScript errors
7. [ ] Bundle size comparison documented
8. [ ] Template literal pattern used for 5+ classes
9. [ ] Global CSS only used when Tailwind truly cannot handle it

---

## 🚨 Critical Success Factors

1. **NO VISUAL CHANGES** - The app must look identical
2. **Performance** - Animations must be equally smooth
3. **Maintainability** - Code should be cleaner and more readable
4. **Type Safety** - Maintain TypeScript support
5. **Bundle Size** - Should decrease after migration

---

## 📝 Notes

- Update this document after each component migration
- Mark checkboxes as components are completed
- Document any deviations or challenges encountered
- Keep track of bundle size changes
- Note any performance improvements/regressions

---

**Last Updated**: 2025-08-21
**Migration Status**: LAYOUT COMPONENTS COMPLETE ✅ (7/7 files)
**Target Completion**: In Progress - Layout Components Done
