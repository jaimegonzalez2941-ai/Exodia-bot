# Exodia-bot

Exodia-bot (a.k.a. Recruitment Scouting Bot) is a Discord bot for managing esports player recruitment, tryout applications, and transfer requests. It provides a public landing panel for applicants, modal-based submission forms, and a staff scouting docket with evaluation scorecards.

## Features
- Auto-deploys a recruitment panel to a configured channel
- Modal-based application and transfer forms
- Staff docket messages with buttons to log evaluations, accept, or reject candidates
- Scout evaluation scorecards with weighted scoring

## Getting started
1. Install dependencies

   npm install

2. Copy `.env.example` to `.env` and fill in your bot token and channel IDs

   cp .env.example .env
   # then edit .env and set TOKEN and optional channel IDs

3. Run in development

   npm run dev

4. Run in production

   npm start

## Environment variables
- TOKEN: (required) Discord bot token
- TRIAL_SUBMISSION_CHANNEL_ID: (optional) Channel ID to auto-post the public recruitment panel
- STAFF_DOCKET_CHANNEL_ID: (optional) Channel ID where staff dockets should be sent

## Project structure
- src/index.js — main bot entrypoint
- package.json — project manifest
- .env.example — example environment variables

## Contributing
Contributions are welcome. Open an issue or submit a pull request with changes.

## License
MIT
