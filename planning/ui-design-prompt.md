# Puka UI/UX Design Prompt Structure

## Complete Generator Prompt for Puka

You are a senior UX designer with expertise in user-centered design and rapid prototyping. Your goal is to translate the completed PRD into functional UI prototypes that demonstrate the specific user journeys documented in the PRD and validate how well different design approaches serve those flows.

## Input: Completed PRD

**PRD Document:**

```
[PASTE PUKA PRD HERE - /Users/campbellrehu/dev/github.com/mushfoo/puka/planning/epic-1-foundation-prd.md]
```

## Puka-Specific Additions

### Mobile-First Requirements

**CRITICAL**: All designs must be mobile-first with responsive scaling to larger screens.

- **Primary viewport**: 375px width (iPhone SE/8/X)
- **Touch targets**: Minimum 44x44px for all interactive elements
- **Thumb-friendly zones**: Primary actions in bottom 60% of screen
- **One-handed operation**: Critical flows must be completable with one thumb
- **Progressive enhancement**: Desktop features added without compromising mobile UX

### Reading Tracker Focus Areas

#### Core Reading Experience
- **Quick capture**: Minimize steps to log reading sessions
- **Session timer**: Prominent, easy-to-start/stop timer
- **Page tracking**: Simple numeric input with smart defaults
- **Progress visualization**: Clear, motivating progress indicators

#### Reading Patterns & Insights
- **Time distribution**: Visual breakdowns of reading times
- **Streak tracking**: Motivating consecutive day counters
- **Goal progress**: Clear daily/weekly/monthly goal tracking
- **Book completion**: Visual progress through current books

#### Social Reading Features
- **Friend activity**: Lightweight feed of reading updates
- **Book discussions**: Simple commenting on reading progress
- **Reading challenges**: Gamified group reading goals
- **Book recommendations**: Friend-based book discovery

## Your Process (Customized for Puka)

### Step 1: Extract & Map User Flows from PRD

Focus on these Puka-specific flows:

#### Primary User Flows
1. **Quick Reading Session Capture**
   - Entry: Home screen quick-add button
   - Flow: Start timer → Read → Stop timer → Log pages
   - Success: Session logged in under 10 seconds

2. **Daily Reading Check-in**
   - Entry: Daily reminder notification
   - Flow: View progress → Log today's reading → See streak update
   - Success: Maintains reading momentum

3. **Book Progress Tracking**
   - Entry: Current reads section
   - Flow: Select book → Update progress → View completion %
   - Success: Clear understanding of reading pace

4. **Social Reading Interaction**
   - Entry: Friends tab or book page
   - Flow: See friend activity → Comment/react → Share own progress
   - Success: Meaningful reading connection made

### Step 2: Choose UI Approach Based on Puka's Needs

Consider these reading-specific patterns:

- **Timer-centric design**: Reading timer as primary UI element
- **Progress-focused design**: Visual progress as main motivator
- **Social-first design**: Friend activity drives engagement
- **Hybrid approach**: Balance all elements for different user types

### Step 3: Create Boilerplate Setup for Mobile-First Testing

```
planning/ui-prototypes/
├── README.md              # Mobile-first testing guide
├── assets/
│   ├── style.css          # Mobile-first styles with responsive breakpoints
│   ├── script.js          # Touch interactions and timer functionality
│   └── icons/             # Reading-specific iconography
├── flows/
│   ├── quick-capture/     # Timer-based reading capture
│   ├── daily-checkin/     # Streak and goal tracking
│   ├── book-progress/     # Progress visualization
│   └── social-reading/    # Friend interactions
├── options/
│   ├── option-1-timer-focused.html    # Timer-centric approach
│   ├── option-2-progress-focused.html  # Visual progress emphasis
│   └── option-3-social-focused.html    # Community-driven design
└── [after selection]
    └── complete-prototype/
        ├── core-reading/
        ├── social-features/
        └── insights/
```

### Step 4: Generate 3 Reading-Focused Design Approaches

#### Option 1: Speed Reader Design
- **File**: `options/option-1-timer-focused.html`
- **Philosophy**: Minimize friction for logging reading sessions
- **Key Features**:
  - Floating timer button (always accessible)
  - One-tap session start/stop
  - Smart page number predictions
  - Minimal data entry
- **Mobile Optimization**: Bottom sheet interactions, thumb-zone actions
- **Best for**: Daily readers, habit builders, busy professionals

#### Option 2: Visual Progress Design
- **File**: `options/option-2-progress-focused.html`
- **Philosophy**: Motivate through beautiful progress visualization
- **Key Features**:
  - Rich progress charts and graphs
  - Book cover galleries with completion rings
  - Reading streak calendars
  - Achievement badges
- **Mobile Optimization**: Swipeable progress cards, vertical scrolling
- **Best for**: Goal-oriented readers, visual learners, completionists

#### Option 3: Reading Community Design
- **File**: `options/option-3-social-focused.html`
- **Philosophy**: Reading is better together
- **Key Features**:
  - Friend activity feed
  - Reading group challenges
  - Book discussions
  - Social book recommendations
- **Mobile Optimization**: Feed-based UI, pull-to-refresh, inline interactions
- **Best for**: Social readers, book clubs, discovery seekers

### Step 5: Mobile-First Page Requirements

Each option must include these mobile-optimized pages:

#### Core Reading Pages
1. **Home/Dashboard**: Quick access to timer, current reads, daily goal
2. **Timer Page**: Full-screen timer with book selection
3. **Session Complete**: Quick page entry, notes, rating
4. **Book Details**: Progress, sessions, notes, social activity

#### Progress Pages
1. **Stats Overview**: Daily/weekly/monthly reading stats
2. **Reading Calendar**: Streak visualization
3. **Goals**: Set and track reading goals
4. **Achievements**: Badges and milestones

#### Social Pages
1. **Friends Feed**: Recent reading activity
2. **Book Discussions**: Comments on specific books
3. **Reading Groups**: Shared reading challenges
4. **Discover**: Friend-recommended books

### Step 6: Puka-Specific Validation Framework

#### Mobile Usability Testing
- [ ] Timer accessible within 1 tap from any screen
- [ ] Session logging completable in under 10 seconds
- [ ] All forms optimized for mobile keyboards
- [ ] Critical actions in thumb-friendly zones

#### Reading Flow Efficiency
- [ ] Start reading session: 1-2 taps maximum
- [ ] Log pages read: Smart defaults reduce typing
- [ ] View progress: Instant visual feedback
- [ ] Share achievement: 1-tap social sharing

#### Engagement Mechanics
- [ ] Streak preservation prominent
- [ ] Progress celebrations automatic
- [ ] Friend activity visible but not intrusive
- [ ] Daily goal reminders contextual

### Step 7: Realistic Reading Content

Use actual reading scenarios:

- **Real book titles**: Popular and diverse genres
- **Realistic page counts**: 15-50 pages per session
- **Authentic reading times**: 20-45 minute sessions
- **Genuine social interactions**: Comments about plot, characters
- **Actual reading goals**: 30 minutes/day, 12 books/year

### Step 8: Mobile Performance Comparison

Focus testing on:

1. **One-handed operation**: Can users complete flows with one thumb?
2. **Session logging speed**: Time from opening app to logged session
3. **Progress checking**: How quickly can users see their stats?
4. **Social interaction**: Ease of engaging with friends' reading

### Step 9: Touch Interaction Documentation

Document mobile interactions:

```html
<!-- 
Mobile Interaction Patterns:
- Swipe right: Navigate back
- Swipe down: Refresh/update
- Long press: Quick actions menu
- Pull down: Reveal timer
- Bottom sheet: Forms and inputs
- Floating action: Start timer

Touch Targets:
- Primary buttons: 48px minimum height
- Icon buttons: 44x44px minimum
- List items: 56px minimum height
- Tab bar: 56px height

Gesture Priorities:
- Start timer: Always accessible
- Log session: Minimal steps
- View progress: Swipe to reveal
-->
```

## Output Requirements for Puka

**Phase 1 - Generate Mobile-First Options**: `planning/ui-prototypes/`

- 3 distinct mobile-first approaches for reading tracking
- Focus on timer, progress, and social aspects
- All designs must work perfectly on 375px width
- Include touch gesture documentation

**Phase 2 - After Selection**: Complete mobile-first prototype

- Fully responsive from 375px to 1920px
- Progressive enhancement for larger screens
- Complete reading tracker functionality
- Social features integrated appropriately

## Platform-Specific Considerations for Puka

### Mobile Web (Primary)
- **PWA-ready**: Installable, offline timer capability
- **Push notifications**: Reading reminders, streak alerts
- **Share API**: Native sharing of reading achievements
- **Camera access**: Book cover scanning (future)

### Responsive Scaling
- **375px**: Full functionality, one-handed use
- **768px**: Two-column layouts where beneficial
- **1024px+**: Enhanced data visualizations, side panels

### Future Native App Considerations
- **Widget support**: Reading timer, daily goal
- **Watch app**: Quick session logging
- **Background timer**: Accurate session tracking

## Summary of Customizations for Puka

1. **Mobile-First Requirement**: All designs start at 375px width
2. **Reading Timer Focus**: Quick access to start/stop reading sessions
3. **Progress Visualization**: Motivating charts and streak tracking
4. **Social Integration**: Lightweight friend activity and book discussions
5. **One-Handed Operation**: Critical flows optimized for thumb reach
6. **Speed Priority**: Session logging in under 10 seconds

## Ready to Execute

This prompt structure is ready to be used with the Puka PRD. Simply:

1. Copy the PRD content from `/Users/campbellrehu/dev/github.com/mushfoo/puka/planning/epic-1-foundation-prd.md`
2. Paste it into the designated section above
3. Execute the complete prompt to generate the 3 mobile-first design variations
4. Focus on the reading tracker functionality throughout all designs