import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Activity, 
  HeartHandshake, 
  PieChart, 
  SlidersHorizontal, 
  BrainCircuit, 
  Settings,
  Database,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', path: '/patients', icon: Users },
  { name: 'Risk Analysis', path: '/risk', icon: Activity },
  { name: 'Intervention Center', path: '/interventions', icon: HeartHandshake },
  { name: 'Analytics', path: '/analytics', icon: PieChart },
  { name: 'What-If Simulator', path: '/simulator', icon: SlidersHorizontal },
  { name: 'Model Performance', path: '/model', icon: BrainCircuit },
  { name: 'Data Management', path: '/data', icon: Database },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 transform bg-card border-r border-slate-200 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-md text-primary-foreground">
              <Activity size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-primary">Medivia</span>
          </div>
          <button className="lg:hidden text-slate-500" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                onClick={() => {
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
              >
                <Icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
