import React from "react";
import { DatabaseUpdateModal } from "@/components/database-update-modal";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white dark:bg-[#1E1E1E] py-4 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
        <div className="text-sm text-[#666666] dark:text-[#AAAAAA] mb-2 sm:mb-0">
          <p className="text-xs mt-1">
            Powered by OpenAI's GPT-4o. <br />
            Magic: The Gathering and its properties are owned by Wizards of the Coast. This site is not affiliated with or endorsed by Wizards of the Coast.
          </p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-4 mb-2">
            <span className="text-sm text-[#666666] dark:text-[#AAAAAA]">
              Spark Arcanum © {currentYear} <span className="ml-2 text-xs bg-gradient-to-r from-[#4777e6] to-[#9c4dff] text-transparent bg-clip-text font-bold">V 1.1.7</span>
            </span>
            <span className="px-2 py-1 bg-gradient-to-r from-[#4777e6]/20 to-[#9c4dff]/20 dark:from-[#4777e6]/30 dark:to-[#9c4dff]/30 text-[#4777e6] dark:text-[#9c4dff] rounded-full text-xs flex items-center border border-[#4777e6]/30 dark:border-[#9c4dff]/30 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08Zm3.094 8.016a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              Database Connected
            </span>
            <DatabaseUpdateModal />
          </div>
          <p className="text-xs text-[#666666] dark:text-[#AAAAAA]">
            Card data © Wizards of the Coast
          </p>
        </div>
      </div>
    </footer>
  );
}
