# Spark Arcanum - Magic: The Gathering Rules & Deck Builder

An advanced Magic: The Gathering comprehensive rules and interaction platform that provides intelligent, AI-powered rule interpretation and interactive deck-building experiences for players.

## Features

### Intelligent Card Search
- Advanced semantic search powered by MTGGraphQL integration
- Comprehensive card database with 114,000+ cards from MTGJSON
- Smart filtering by format, type, rarity, and mana cost
- Enhanced search results with exact match prioritization

### Interactive Deck Builder
- Modern deck building interface with format validation
- Save and manage personal deck collections
- Browse public decks organized by format
- Import deck lists via text parsing (supports Deck/Sideboard format)
- Export decks as downloadable text files
- Real-time deck validation and statistics

### AI-Powered Rules Assistant
- OpenAI GPT-4o integration for rule interpretation
- Context-aware rule explanations with card interactions
- Comprehensive rules database search and analysis
- Interactive conversation history

### User Authentication & Privacy
- Secure user registration and login system
- Password reset functionality via email
- GDPR-compliant cookie notice
- Privacy-focused data handling

### Modern User Experience
- Responsive mobile-first design
- Dark/light theme support with smooth transitions
- Professional UI components with shadcn/ui
- Real-time updates and seamless navigation

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TanStack Query** for efficient data fetching
- **Wouter** for lightweight routing
- **Tailwind CSS** for styling
- **shadcn/ui** for component library

### Backend
- **Node.js** with Express server
- **TypeScript** for type safety
- **Drizzle ORM** with PostgreSQL database
- **OpenAI API** integration
- **MTGGraphQL** for card data

### Database
- **PostgreSQL** with comprehensive schema

## Version History

### Version 1.1.6 (Current)
- Added GDPR-compliant cookie/privacy notice
- Removed Card Search from navigation menu
- Updated AI Assistant to scroll to main page section
- Fixed authentication middleware ordering for deck saving
- Resolved card image display issues
- Updated footer to version 1.1.6

### Version 1.1.5
- Critical security fix for authentication system
- Complete SMTP email integration for password reset
- Forgot password functionality with secure token system
- Enhanced authentication service with proper validation
- UI improvements for login and password reset flows

## Configuration

### Environment Variables
Required secrets:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI functionality
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`: Email configuration for password reset

### Deployment
1. Ensure all dependencies are installed
2. Configure required environment variables
3. Run database migrations: `npm run db:push`
4. Start the application: `npm run dev`
5. For production deployment, use Replit's deployment button

## Development

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Push database schema changes
npm run db:push
```

### Key Features
- Comprehensive MTG card database with 114,000+ cards
- AI-powered rule interpretation and deck suggestions
- User authentication with secure password management
- Responsive design supporting all device sizes
- Privacy-compliant data handling
- **MTGJSON** data integration
- Optimized queries with indexing
- Session management and caching

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/spark-arcanum.git
cd spark-arcanum
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/spark_arcanum

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/           # Utilities and configuration
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express server
│   ├── mtg/              # MTG-specific services
│   ├── routes.ts         # API route definitions
│   └── storage.ts        # Database operations
├── shared/               # Shared types and schemas
└── public/              # Static assets
```

## API Endpoints

### Cards
- `GET /api/cards/search` - Search for cards
- `GET /api/cards/enhanced-search` - Enhanced search with filters
- `GET /api/cards/:id` - Get card by ID
- `POST /api/cards/load` - Load cards from file

### Rules & AI
- `GET /api/rulings/conversation` - Get conversation history
- `POST /api/rulings` - Ask rule questions
- `POST /api/rules/update` - Update rules database

### Metadata
- `GET /api/metadata` - Get database information

## Features in Detail

### Card Search
The search system combines multiple data sources:
- Local PostgreSQL database for fast queries
- MTGGraphQL API for comprehensive results
- Smart relevance scoring and exact match prioritization
- Format legality validation

### Deck Builder
- Text-based import supporting standard deck list formats
- Visual deck construction with card counts
- Export functionality for sharing decks
- Session isolation between users

### AI Rules Assistant
- Context-aware rule interpretation
- Integration with comprehensive rules database
- Conversation memory for complex interactions
- Card-specific ruling explanations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Database Schema

The application uses a normalized PostgreSQL schema with tables for:
- `cards` - MTG card data with comprehensive attributes
- `rulings` - AI-generated rule explanations
- `conversations` - Chat history with the AI assistant
- `rules` - Comprehensive rules database
- `db_metadata` - Database versioning and statistics

## Deployment

The application is designed for deployment on platforms like:
- Replit Deployments
- Vercel
- Railway
- Heroku

See `DEPLOYMENT.md` for detailed deployment instructions.

## License

This project is licensed under the MIT License. See `LICENSE` file for details.

## Disclaimer

Magic: The Gathering and its properties are owned by Wizards of the Coast. This application is not affiliated with or endorsed by Wizards of the Coast. Card data is sourced from MTGJSON.com under fair use.

## Version

Current version: **1.1.4**
- Enhanced session management
- Improved card search accuracy
- Optimized database queries
- Better mobile responsiveness