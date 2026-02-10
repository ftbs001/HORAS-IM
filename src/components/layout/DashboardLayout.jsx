import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = ({ children, onNavigate, currentView, onLogout }) => {
    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            {/* Sidebar */}
            <Sidebar onNavigate={onNavigate} currentView={currentView} onLogout={onLogout} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <Header onNavigate={onNavigate} />

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center shadow-sm relative z-10">
                    <p className="text-sm text-gray-500">
                        Copyright © {new Date().getFullYear()}. HORAS-IM - Kantor Imigrasi Kelas II TPI Pematangsiantar.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default DashboardLayout;
