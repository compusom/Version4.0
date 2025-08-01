
import React from 'react';
import { AppView } from '../types';

interface NavbarProps {
    currentView: AppView;
    onNavigate: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
    
    const navItems: { view: AppView; label: string; }[] = [
        { view: 'creative_analysis', label: 'Análisis de Creativos' },
        { view: 'performance', label: 'Rendimiento' },
        { view: 'strategies', label: 'Estrategias' },
        { view: 'reports', label: 'Reportes' },
        { view: 'clients', label: 'Clientes' },
        { view: 'import', label: 'Importar' },
        { view: 'logs', label: 'Logs' },
        { view: 'control_panel', label: 'Panel de Control' },
        { view: 'help', label: 'Ayuda' },
        { view: 'connections', label: 'Conexiones' },
    ];

    return (
        <nav className="bg-brand-surface p-4 rounded-lg shadow-md mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {navItems.map(item => {
                    return (
                        <button 
                            key={item.view}
                            onClick={() => onNavigate(item.view)}
                            className={`font-semibold transition-colors ${currentView === item.view ? 'text-brand-primary' : 'text-brand-text-secondary hover:text-brand-text'}`}
                        >
                            {item.label}
                        </button>
                    )
                })}
            </div>
        </nav>
    );
};
