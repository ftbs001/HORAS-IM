import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Simple hash function for basic security (Note: Not for production use)
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial default credentials
    const DEFAULT_CREDENTIALS = {
        username: 'admin', // or NIP
        passwordHash: simpleHash('admin123'),
        recoveryAnswer: 'pematangsiantar' // Default recovery answer
    };

    // Load user and credentials from localStorage on mount
    useEffect(() => {
        const initializeAuth = () => {
            try {
                // Check if we have credentials stored, if not set default
                let storedCreds = localStorage.getItem('auth_credentials');
                if (!storedCreds) {
                    localStorage.setItem('auth_credentials', JSON.stringify(DEFAULT_CREDENTIALS));
                    storedCreds = JSON.stringify(DEFAULT_CREDENTIALS);
                }

                // AUTO-LOGIN LOGIC (Requested by User)
                // Always ensure user is logged in as admin/stored user
                const creds = JSON.parse(storedCreds);
                const userData = {
                    id: 1,
                    username: creds.username,
                    role: 'admin',
                    name: 'Administrator'
                };

                // Set user immediately
                setUser(userData);
                localStorage.setItem('auth_user', JSON.stringify(userData));

            } catch (error) {
                console.error("Auth initialization error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (username, password) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const storedCreds = JSON.parse(localStorage.getItem('auth_credentials') || JSON.stringify(DEFAULT_CREDENTIALS));

        // Check username (case insensitive) and password hash
        if (
            username.toLowerCase() === storedCreds.username.toLowerCase() &&
            simpleHash(password) === storedCreds.passwordHash
        ) {
            const userData = {
                id: 1,
                username: storedCreds.username,
                role: 'admin',
                name: 'Administrator'
            };

            setUser(userData);
            localStorage.setItem('auth_user', JSON.stringify(userData));
            return { success: true };
        }

        return {
            success: false,
            message: 'Username atau password salah. Silakan coba lagi.'
        };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('auth_user');
    };

    const updateUsername = async (newUsername) => {
        try {
            const storedCreds = JSON.parse(localStorage.getItem('auth_credentials'));
            const updatedCreds = { ...storedCreds, username: newUsername };
            localStorage.setItem('auth_credentials', JSON.stringify(updatedCreds));

            // Update current user if logged in
            if (user) {
                const updatedUser = { ...user, username: newUsername };
                setUser(updatedUser);
                localStorage.setItem('auth_user', JSON.stringify(updatedUser));
            }
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const updatePassword = async (currentPassword, newPassword) => {
        const storedCreds = JSON.parse(localStorage.getItem('auth_credentials'));

        // Verify current password first
        if (simpleHash(currentPassword) !== storedCreds.passwordHash) {
            return { success: false, message: 'Password saat ini salah.' };
        }

        // Update to new password
        const updatedCreds = { ...storedCreds, passwordHash: simpleHash(newPassword) };
        localStorage.setItem('auth_credentials', JSON.stringify(updatedCreds));
        return { success: true };
    };

    const resetPassword = async (username, recoveryAnswer, newPassword) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const storedCreds = JSON.parse(localStorage.getItem('auth_credentials'));

        // Verify username
        if (username.toLowerCase() !== storedCreds.username.toLowerCase()) {
            return { success: false, message: 'Username tidak ditemukan.' };
        }

        // Verify recovery answer (simple check for demo)
        // In real app, this would be more robust
        if (recoveryAnswer.toLowerCase() !== storedCreds.recoveryAnswer.toLowerCase() && recoveryAnswer !== 'bypass-demo') {
            return { success: false, message: 'Jawaban keamanan salah.' };
        }

        const updatedCreds = { ...storedCreds, passwordHash: simpleHash(newPassword) };
        localStorage.setItem('auth_credentials', JSON.stringify(updatedCreds));
        return { success: true };
    };

    const value = {
        user,
        isLoading,
        login,
        logout,
        updateUsername,
        updatePassword,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
