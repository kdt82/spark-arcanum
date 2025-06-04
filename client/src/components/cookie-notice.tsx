import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie } from 'lucide-react';

export default function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the cookie notice
    const cookieConsent = localStorage.getItem('spark-arcanum-cookie-consent');
    if (!cookieConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('spark-arcanum-cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('spark-arcanum-cookie-consent', 'declined');
    window.location.href = 'https://google.com';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed left-4 bottom-4 z-50 max-w-sm animate-in slide-in-from-left-5">
      <Card className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Cookie & Privacy Notice
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                We use cookies and collect standard website data to improve your experience. 
                We do not sell any data collected from this website.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={handleAccept}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5"
                >
                  Accept
                </Button>
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs py-1.5 border-gray-300 dark:border-gray-600"
                >
                  Decline
                </Button>
              </div>
            </div>
            <button
              onClick={handleDecline}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}