import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const SectionContext = createContext();

export const useSection = () => {
    const context = useContext(SectionContext);
    if (!context) {
        throw new Error('useSection must be used within SectionProvider');
    }
    return context;
};

export const SectionProvider = ({ children }) => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Default fallback data (used if Supabase table doesn't exist or is empty)
    const defaultSections = [
        {
            id: 1,
            name: 'Seksi Inteldakim',
            alias: 'Intelijen & Penindakan Keimigrasian',
            staff: 24,
            programs: 8,
            performance: 92,
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
            description: 'Bertanggung jawab atas pengawasan orang asing dan penegakan hukum keimigrasian di wilayah kerja Pematang Siantar.'
        },
        {
            id: 2,
            name: 'Seksi Lalintalkim',
            alias: 'Lalu Lintas & Izin Tinggal Keimigrasian',
            staff: 18,
            programs: 6,
            performance: 95,
            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
            description: 'Melayani penerbitan paspor RI, izin tinggal warga negara asing, dan pelayanan keimigrasian lainnya.'
        },
        {
            id: 3,
            name: 'Seksi Tikim',
            alias: 'Teknologi Informasi & Komunikasi',
            staff: 8,
            programs: 4,
            performance: 88,
            icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
            description: 'Mengelola sistem informasi manajemen keimigrasian, penyebaran informasi, dan pemeliharaan infrastruktur TI.'
        },
        {
            id: 4,
            name: 'Subbag Tata Usaha',
            alias: 'Fasilitatif & Kepegawaian',
            staff: 15,
            programs: 7,
            performance: 90,
            icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
            description: 'Menangani urusan kepegawaian, keuangan, persuratan, dan urusan rumah tangga kantor.'
        }
    ];

    // Fetch sections from Supabase
    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sections')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.warn('Supabase error, using fallback data:', error);
                setSections(defaultSections);
            } else if (data && data.length > 0) {
                // Deduplicate data from Supabase based on ID
                // Map automatically handles deduplication by key (item.id)
                // We convert to Map and back to Array to ensure uniqueness
                const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
                console.log('Fetched sections from Supabase:', uniqueData.length);
                setSections(uniqueData);
            } else {
                // Empty result, use fallback
                console.log('No data in Supabase, using fallback sections');
                setSections(defaultSections);
            }
        } catch (err) {
            console.warn('Fetch error, using fallback data:', err);
            setSections(defaultSections);
        }
        setLoading(false);
    };

    const updateSection = async (id, updatedData) => {
        try {
            const { error } = await supabase
                .from('sections')
                .update({
                    ...updatedData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) {
                console.error('Error updating section:', error);
                return { success: false, error };
            }

            // Update local state
            setSections(prev => prev.map(s => s.id === id ? { ...s, ...updatedData } : s));
            return { success: true };
        } catch (err) {
            console.error('Update exception:', err);
            return { success: false, error: err };
        }
    };

    const addSection = async (sectionData) => {
        try {
            // Remove id if it exists (let DB handle auto-increment) or generate one if strictly client-side
            const { id, ...dataToInsert } = sectionData;

            // If using Supabase, insert
            const { data, error } = await supabase
                .from('sections')
                .insert([dataToInsert])
                .select();

            if (error) {
                console.error('Error adding section:', error);

                // Fallback for demo/offline mode
                const newId = Math.max(...sections.map(s => s.id), 0) + 1;
                const newSection = { ...sectionData, id: newId };
                setSections(prev => [...prev, newSection]);
                return { success: true };
            }

            if (data) {
                setSections(prev => [...prev, data[0]]);
                return { success: true };
            }
            return { success: true };
        } catch (err) {
            console.error('Add exception:', err);
            // Fallback for demo
            const newId = Math.max(...sections.map(s => s.id), 0) + 1;
            const newSection = { ...sectionData, id: newId };
            setSections(prev => [...prev, newSection]);
            return { success: true };
        }
    };

    const deleteSection = async (id) => {
        try {
            const { error } = await supabase
                .from('sections')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting section:', error);
                // Fallback attempt to update local state anyway (if offline)
                setSections(prev => prev.filter(s => s.id !== id));
                return { success: true };
            }

            setSections(prev => prev.filter(s => s.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Delete exception:', err);
            setSections(prev => prev.filter(s => s.id !== id));
            return { success: true };
        }
    };

    const value = {
        sections,
        loading,
        updateSection,
        addSection,
        deleteSection,
        fetchSections
    };

    return (
        <SectionContext.Provider value={value}>
            {children}
        </SectionContext.Provider>
    );
};
