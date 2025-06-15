import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/mana-symbols.css";

// Get stored theme preference
const storedTheme = localStorage.getItem('theme') || 'light';

// Set initial theme with the EXACT color codes specified
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  document.documentElement.style.backgroundColor = '#121212';
  document.body.style.backgroundColor = '#121212';
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.style.backgroundColor = '#E0E2E3';
  document.body.style.backgroundColor = '#E0E2E3';
}

// Apply theme-specific styles through a conditional style tag with EXACT color codes
const styleTag = document.createElement('style');
styleTag.textContent = `
  html:not(.dark) body {
    background-color: #E0E2E3 !important;
    color: #334155 !important;
  }
  
  html:not(.dark) .bg-white, 
  html:not(.dark) .card, 
  html:not(.dark) .panel, 
  html:not(.dark) [class*='bg-white'], 
  html:not(.dark) [class*='bg-card'], 
  html:not(.dark) .rounded-lg {
    background-color: #E9EBED !important;
    border-color: #d1d5db !important;
  }
  
  html:not(.dark) header,
  html:not(.dark) footer {
    background-color: #E9EBED !important;
    border-color: #d1d5db !important;
  }
  
  html:not(.dark) .flex.flex-col.min-h-screen {
    background-color: #E0E2E3 !important;
  }
  
  html.dark body {
    background-color: #121212 !important;
    color: #E0E0E0 !important;
  }
  
  html.dark .bg-white, 
  html.dark .card, 
  html.dark .panel, 
  html.dark [class*='bg-white'], 
  html.dark [class*='bg-card'], 
  html.dark .rounded-lg {
    background-color: #1E1E1E !important;
    border-color: #333333 !important;
  }
  
  html.dark header,
  html.dark footer {
    background-color: #1E1E1E !important;
    border-color: #333333 !important;
  }
  
  html.dark .flex.flex-col.min-h-screen {
    background-color: #121212 !important;
  }
`;
document.head.appendChild(styleTag);

createRoot(document.getElementById("root")!).render(
  <App />
);
