import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';

const PolicyBriefContext = createContext();

export const usePolicyBrief = () => {
    const context = useContext(PolicyBriefContext);
    if (!context) {
        throw new Error('usePolicyBrief must be used within PolicyBriefProvider');
    }
    return context;
};

export const PolicyBriefProvider = ({ children }) => {
    const { showNotification } = useNotification();

    // State
    const [reportId, setReportId] = useState('draft-current'); // Default draft ID
    const [sectionContents, setSectionContents] = useState({});
    const [attachments, setAttachments] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Ref for debounce timeouts
    const saveTimeoutRef = useRef({});

    // Load saved content on mount
    useEffect(() => {
        loadReport(reportId);
    }, [reportId]);

    // Load report from database
    const loadReport = async (reportIdToLoad) => {
        setLoading(true);
        try {
            // 1. Load section contents
            const { data: contentData, error: contentError } = await supabase
                .from('policy_briefs')
                .select('*')
                .eq('report_id', reportIdToLoad);

            if (contentError) throw contentError;

            if (contentData && contentData.length > 0) {
                const mappedContent = {};
                contentData.forEach(item => {
                    if (item.content) {
                        mappedContent[item.section_id] = item.content;
                    }
                });
                setSectionContents(mappedContent);

                // Set last saved time
                const latestUpdate = contentData.reduce((latest, item) => {
                    const itemDate = new Date(item.updated_at);
                    return itemDate > latest ? itemDate : latest;
                }, new Date(0));
                setLastSaved(latestUpdate);
            } else {
                setSectionContents({});
                setLastSaved(null);
            }

            // 2. Load attachments
            const { data: attachmentData, error: attachmentError } = await supabase
                .from('policy_brief_attachments')
                .select('*')
                .eq('report_id', reportIdToLoad);

            if (attachmentError) throw attachmentError;

            if (attachmentData) {
                const mappedAttachments = {};
                attachmentData.forEach(file => {
                    if (!mappedAttachments[file.section_id]) {
                        mappedAttachments[file.section_id] = [];
                    }
                    mappedAttachments[file.section_id].push({
                        id: file.id,
                        name: file.file_name,
                        type: file.file_type,
                        size: file.file_size,
                        url: file.public_url,
                        path: file.file_path
                    });
                });
                setAttachments(mappedAttachments);
            }

        } catch (error) {
            console.error('Error loading report:', error);
            showNotification('Gagal memuat draft: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Update section content with auto-save (debounced)
    const updateSection = useCallback((sectionId, htmlContent) => {
        // Optimistic update - update UI immediately
        setSectionContents(prev => ({
            ...prev,
            [sectionId]: htmlContent
        }));

        // Clear existing timeout for this section
        if (saveTimeoutRef.current[sectionId]) {
            clearTimeout(saveTimeoutRef.current[sectionId]);
        }

        // Set new timeout - debounce 1 second
        saveTimeoutRef.current[sectionId] = setTimeout(async () => {
            setIsSaving(true);
            try {
                const { error } = await supabase
                    .from('policy_briefs')
                    .upsert(
                        {
                            report_id: reportId,
                            section_id: sectionId,
                            content: htmlContent
                        },
                        { onConflict: 'report_id,section_id' }
                    );

                if (error) {
                    console.error('Error saving section:', error);
                    showNotification('Gagal menyimpan: ' + error.message, 'error');
                    return;
                }

                // Update last saved time
                setLastSaved(new Date());
                console.log('Auto-saved:', sectionId);

            } catch (error) {
                console.error('Save exception:', error);
                showNotification('Gagal menyimpan: ' + error.message, 'error');
            } finally {
                setIsSaving(false);
            }
        }, 1000); // 1 second debounce

    }, [reportId, showNotification]);

    // Get section content
    const getSectionContent = useCallback((sectionId) => {
        return sectionContents[sectionId] || '';
    }, [sectionContents]);

    // Add attachment (upload to storage)
    const addAttachment = async (sectionId, file) => {
        try {
            // 1. Upload to Storage
            const filePath = `${reportId}/${sectionId}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('policy-brief-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: publicData } = supabase.storage
                .from('policy-brief-files')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            // 3. Insert into Database
            const { data: insertData, error: insertError } = await supabase
                .from('policy_brief_attachments')
                .insert([{
                    report_id: reportId,
                    section_id: sectionId,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    file_type: file.type,
                    public_url: publicUrl
                }])
                .select();

            if (insertError) throw insertError;

            const newFileRecord = insertData[0];

            // 4. Update Local State
            const newAttachment = {
                id: newFileRecord.id,
                name: newFileRecord.file_name,
                type: newFileRecord.file_type,
                size: newFileRecord.file_size,
                url: newFileRecord.public_url,
                path: newFileRecord.file_path
            };

            setAttachments(prev => {
                const currentFiles = prev[sectionId] || [];
                return {
                    ...prev,
                    [sectionId]: [...currentFiles, newAttachment]
                };
            });

            showNotification('File berhasil diupload', 'success');
            return newAttachment;

        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('Gagal mengupload file: ' + error.message, 'error');
            throw error;
        }
    };

    // Remove attachment
    const removeAttachment = async (sectionId, fileId) => {
        try {
            // Find file to get path
            const fileToRemove = attachments[sectionId]?.find(f => f.id === fileId);
            if (!fileToRemove) return;

            // 1. Remove from Storage
            const { error: storageError } = await supabase.storage
                .from('policy-brief-files')
                .remove([fileToRemove.path]);

            if (storageError) console.warn('Storage delete warning:', storageError);

            // 2. Remove from DB
            const { error: dbError } = await supabase
                .from('policy_brief_attachments')
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            // 3. Update Local State
            setAttachments(prev => {
                const currentFiles = prev[sectionId] || [];
                return {
                    ...prev,
                    [sectionId]: currentFiles.filter(f => f.id !== fileId)
                };
            });

            showNotification('File dihapus', 'info');

        } catch (error) {
            console.error('Error deleting file:', error);
            showNotification('Gagal menghapus file', 'error');
        }
    };

    // Get attachments for a section
    const getAttachments = useCallback((sectionId) => {
        return attachments[sectionId] || [];
    }, [attachments]);

    // Create new report
    const createNewReport = (title) => {
        const newReportId = `report-${Date.now()}`;
        setReportId(newReportId);
        setSectionContents({});
        setAttachments({});
        setLastSaved(null);
        showNotification('Draft baru dibuat', 'success');
        return newReportId;
    };

    // Manual save all (optional - for explicit save button)
    const saveAll = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(sectionContents).map(([sectionId, content]) =>
                supabase.from('policy_briefs').upsert({
                    report_id: reportId,
                    section_id: sectionId,
                    content: content
                }, { onConflict: 'report_id,section_id' })
            );

            await Promise.all(promises);
            setLastSaved(new Date());
            showNotification('Semua perubahan disimpan', 'success');

        } catch (error) {
            console.error('Error saving all:', error);
            showNotification('Gagal menyimpan: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const value = {
        reportId,
        sectionContents,
        updateSection,
        getSectionContent,
        attachments,
        addAttachment,
        removeAttachment,
        getAttachments,
        loading,
        lastSaved,
        isSaving,
        loadReport,
        createNewReport,
        saveAll
    };

    return (
        <PolicyBriefContext.Provider value={value}>
            {children}
        </PolicyBriefContext.Provider>
    );
};
