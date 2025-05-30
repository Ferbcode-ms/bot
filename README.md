# PunjabiExamBot

A monetized Telegram Quiz Bot for Punjabi government exams.

## Features

- Category-based quizzes
- Session management (3-hour limit)
- Website for session renewal with ads
- MongoDB integration for questions and user sessions

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Telegram Bot Token (from BotFather)

## Setup

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd punjabiexambot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your details:

   ```
   BOT_TOKEN=your_telegram_bot_token_here
   MONGODB_URI=your_mongodb_atlas_connection_string_here
   WEB_URL=https://yourwebsite.com
   PORT=3000
   ```

4. Seed the database with sample questions:

   ```bash
   node scripts/seedQuestions.js
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Start the bot:
   ```bash
   npm run bot
   ```

## Usage

1. Start the bot on Telegram: `/start`
2. Choose a category and start the quiz
3. Answer 10 questions
4. If your session expires, visit the website to renew

## Project Structure

- `bot/telegramBot.js`: Telegram bot logic
- `server/`: Express backend
  - `models/`: Mongoose schemas
  - `routes/`: API routes
  - `server.js`: Main server file
- `public/`: Static files (website)
- `scripts/`: Utility scripts (e.g., database seeding)

## License

MIT
