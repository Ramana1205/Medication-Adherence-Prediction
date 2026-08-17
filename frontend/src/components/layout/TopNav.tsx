import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface TopNavProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ setSidebarOpen }) => {
  return (
    <header className="h-16 bg-card border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="outline" className="hidden sm:inline-flex bg-amber-50 text-amber-700 border-amber-200">
          Demo Data Mode
        </Badge>
        
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-white"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
            Dr
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            Dr. Sarah Jenkins
          </span>
        </div>
      </div>
    </header>
  );
};
