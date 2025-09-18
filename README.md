# BuildOn Voting App

A React voting application designed for large projector screens, built with Next.js and deployed on Vercel.

## Features

- Clean, projector-friendly UI
- Three voting options with placeholder content
- Real-time vote counting and percentage display
- Visual vote progress bars
- Reset functionality
- Responsive design

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

This app is configured for easy deployment on Vercel:

1. Push to a Git repository
2. Connect to Vercel
3. Deploy automatically

## Customization

To customize the voting options, edit the `options` state in `app/page.tsx`:

- Change titles and descriptions
- Add real images by replacing the placeholder image divs
- Modify colors and styling in `app/globals.css`