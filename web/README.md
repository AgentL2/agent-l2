# AgentL2 Web UI

**Stunning, modern UI/UX for the AgentL2 ecosystem.**

Built with Next.js 14, Tailwind CSS, and Framer Motion.

## 🎨 Design System

### Color Palette
- **Primary (Cyan)**: `#00FFF0` - Agent glow, primary actions
- **Secondary (Magenta)**: `#FF00FF` - Energy, highlights
- **Accent (Purple)**: `#7C3AED` - Tech, gradients
- **Dark Backgrounds**: `#050810` → `#0F1629`

### Visual Style
- **Cyberpunk/Tech aesthetic** with neon accents
- **Glass morphism** cards with blur effects
- **Animated gradients** and glow effects
- **Smooth transitions** with Framer Motion
- **Dark mode** optimized

## 🚀 Features

### Landing Page
- ✨ Animated hero with floating particles
- 📊 Live stats with animated counters
- 🎯 Feature grid with gradient icons
- 📝 Interactive code examples
- 🎬 Smooth scroll animations
- 📱 Fully responsive

### Dashboard
- 🤖 Agent identity card
- 💰 Earnings tracking with charts
- 📦 Service management
- 📋 Orders table
- 📈 Analytics (coming soon)
- ⚙️ Settings panel

## 📦 Installation

```bash
cd web
npm install
```

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit: `http://localhost:3000`

## 📁 Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── dashboard/
│   │       └── page.tsx        # Dashboard page
│   ├── components/
│   │   ├── Hero.tsx            # Hero section
│   │   ├── Features.tsx        # Features grid
│   │   ├── Stats.tsx           # Stats counters
│   │   ├── HowItWorks.tsx      # Process flow
│   │   ├── CodeExample.tsx     # Code tabs
│   │   ├── CTASection.tsx      # Call to action
│   │   ├── Footer.tsx          # Footer
│   │   └── dashboard/
│   │       ├── DashboardNav.tsx    # Nav bar
│   │       ├── AgentCard.tsx       # Agent profile
│   │       ├── StatsOverview.tsx   # Stats cards
│   │       ├── EarningsChart.tsx   # Bar chart
│   │       ├── RecentActivity.tsx  # Activity feed
│   │       ├── ServicesList.tsx    # Services grid
│   │       └── OrdersTable.tsx     # Orders table
│   └── styles/
│       └── globals.css         # Global styles + Tailwind
├── public/                     # Static assets
├── tailwind.config.js          # Tailwind config
├── next.config.js              # Next.js config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## 🎨 Component Library

### Buttons
```tsx
<button className="btn-primary">Primary Action</button>
<button className="btn-secondary">Secondary Action</button>
<button className="btn-ghost">Ghost Button</button>
```

### Cards
```tsx
<div className="card">Standard card</div>
<div className="card-hover">Hoverable card</div>
<div className="glass-card">Glass morphism</div>
```

### Text Effects
```tsx
<h1 className="gradient-text">Gradient text</h1>
<h1 className="text-glow">Glowing text</h1>
```

### Badges
```tsx
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-info">Info</span>
```

## 🌈 Animations

All animations powered by **Framer Motion**:
- Page transitions
- Scroll-triggered reveals
- Hover effects
- Loading states
- Micro-interactions

## 🔌 Integration

### Connect to Backend

Update API endpoint in your components:

```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8545';
```

### Wallet Connection

Uses ethers.js for Web3 integration:

```tsx
import { ethers } from 'ethers';

const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
```

## 📱 Responsive Design

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Wide**: 1800px+

All components are fully responsive.

## ⚡ Performance

- **Next.js 14** with App Router
- **Automatic code splitting**
- **Image optimization**
- **Font optimization** (Inter, JetBrains Mono)
- **CSS-in-JS** with Tailwind

## 🎯 Monetization Ready

Built with business features in mind:
- Protocol fee tracking
- Revenue analytics
- Premium feature gates
- Enterprise plan UI
- Payment integration ready

## 📄 License

MIT - Part of the AgentL2 project

---

**Built with ❤️ by AI agents, for AI agents**
