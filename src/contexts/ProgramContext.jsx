import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const ProgramContext = createContext();

export const useProgram = () => {
    const context = useContext(ProgramContext);
    if (!context) {
        throw new Error('useProgram must be used within ProgramProvider');
    }
    return context;
};

export const ProgramProvider = ({ children }) => {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Fetch
    useEffect(() => {
        fetchPrograms();
    }, []);

    const fetchPrograms = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('work_programs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching programs:', error);
        } else {
            // Map DB fields to App fields
            const mappedData = data.map(item => ({
                id: item.id,
                year: item.program_year,
                title: item.title,
                section: item.section,
                output: item.output_goal,
                iku: item.iku,
                target: item.target_achievement,
                deadline: item.deadline,
                budget: item.budget,
                status: item.status,
                progress: item.progress,
                realization: item.realization
            }));
            setPrograms(mappedData);
        }
        setLoading(false);
    };

    const addProgram = async (newProgram) => {
        // Map App fields to DB fields
        const dbPayload = {
            program_year: newProgram.year || '2026',
            title: newProgram.title,
            section: newProgram.section,
            output_goal: newProgram.output,
            iku: newProgram.iku,
            target_achievement: newProgram.target,
            deadline: newProgram.deadline,
            budget: newProgram.budget,
            status: newProgram.status || 'Planned',
            progress: newProgram.progress || 0,
            realization: newProgram.realization || 0
        };

        const { data, error } = await supabase
            .from('work_programs')
            .insert([dbPayload])
            .select();

        if (error) {
            console.error('Error adding program:', error);
            throw error;
        }

        if (data) {
            const item = data[0];
            const mappedItem = {
                id: item.id,
                year: item.program_year,
                title: item.title,
                section: item.section,
                output: item.output_goal,
                iku: item.iku,
                target: item.target_achievement,
                deadline: item.deadline,
                budget: item.budget,
                status: item.status,
                progress: item.progress,
                realization: item.realization
            };
            setPrograms(prev => [mappedItem, ...prev]);
            return mappedItem;
        }
    };

    const updateProgram = async (id, updatedData) => {
        // Prepare DB payload (partial update)
        const dbPayload = {};
        if (updatedData.year) dbPayload.program_year = updatedData.year;
        if (updatedData.title) dbPayload.title = updatedData.title;
        if (updatedData.section) dbPayload.section = updatedData.section;
        if (updatedData.output) dbPayload.output_goal = updatedData.output;
        if (updatedData.iku) dbPayload.iku = updatedData.iku;
        if (updatedData.target) dbPayload.target_achievement = updatedData.target;
        if (updatedData.deadline) dbPayload.deadline = updatedData.deadline;
        if (updatedData.budget !== undefined) dbPayload.budget = updatedData.budget;
        if (updatedData.status) dbPayload.status = updatedData.status;
        if (updatedData.progress !== undefined) dbPayload.progress = updatedData.progress;
        if (updatedData.realization !== undefined) dbPayload.realization = updatedData.realization;

        const { error } = await supabase
            .from('work_programs')
            .update(dbPayload)
            .eq('id', id);

        if (error) {
            console.error('Error updating program:', error);
        } else {
            setPrograms(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
        }
    };

    const deleteProgram = async (id) => {
        const { error } = await supabase
            .from('work_programs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting program:', error);
        } else {
            setPrograms(prev => prev.filter(p => p.id !== id));
        }
    };

    return (
        <ProgramContext.Provider value={{
            programs,
            addProgram,
            updateProgram,
            deleteProgram,
            loading,
            fetchPrograms
        }}>
            {children}
        </ProgramContext.Provider>
    );
};
