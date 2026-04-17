import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children, onNavigate, currentView, onLogout }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
            {/* Sidebar */}
            <Sidebar onNavigate={onNavigate} currentView={currentView} onLogout={onLogout} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <Header onNavigate={onNavigate} />

                {/* Main Content — pages manage their own height; main scrolls for non-split-scroll views */}
                <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center shadow-sm relative z-10 flex-shrink-0">
                    <p className="text-sm text-gray-500">
                        Copyright © {new Date().getFullYear()}. HORAS-IM - Kantor Imigrasi Kelas II TPI Pematangsiantar.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default DashboardLayout;
