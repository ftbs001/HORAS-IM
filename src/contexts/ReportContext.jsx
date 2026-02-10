import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from './NotificationContext';

const ReportContext = createContext();

export const useReport = () => {
    const context = useContext(ReportContext);
    if (!context) {
        throw new Error('useReport must be used within ReportProvider');
    }
    return context;
};

// Mapping table for Sections to TOC Chapters
export const SECTION_TOC_MAPPING = {
    'inteldakim': ['bab2_substantif_intel', 'bab2_substantif_pengaduan'],
    'lalintalkim': ['bab2_substantif_dokumen', 'bab2_substantif_izintinggal'],
    'tikim': ['bab2_substantif_rekapitulasi', 'bab2_substantif_infokim'],
    'tata_usaha': ['bab1', 'bab2_fasilitatif', 'bab4', 'bab5']
};

export const ReportProvider = ({ children }) => {
    const { showNotification } = useNotification();
    // Initial State - Will be populated from DB
    const [reportData, setReportData] = useState({});
    const [reportAttachments, setReportAttachments] = useState({});
    const [coverLetterData, setCoverLetterData] = useState({});
    const [coverPageData, setCoverPageData] = useState({});
    const [forewordData, setForewordData] = useState({});
    const [loading, setLoading] = useState(true);

    // Ref for debounce timeouts
    const saveTimeoutRef = useRef({});

    // Initial Fetch
    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // 1. Fetch Text Content
            const { data: textData, error: textError } = await supabase
                .from('monthly_reports')
                .select('*');

            if (textError) throw textError;

            if (textData && textData.length > 0) {
                const mappedText = {};
                textData.forEach(item => {
                    // Only set if content exists and is not empty
                    if (item.content !== null && item.content !== undefined && item.content !== '') {
                        mappedText[item.section_key] = item.content;
                    }
                });
                // Replace state completely instead of merging to prevent data loss
                setReportData(mappedText);
            } else {
                // Set empty object if no data exists
                setReportData({});
            }

            // 2. Fetch Attachments
            const { data: fileData, error: fileError } = await supabase
                .from('report_attachments')
                .select('*');

            if (fileError) throw fileError;

            if (fileData) {
                const mappedFiles = {};
                fileData.forEach(file => {
                    if (!mappedFiles[file.section_key]) mappedFiles[file.section_key] = [];
                    mappedFiles[file.section_key].push({
                        id: file.id,
                        name: file.file_name,
                        type: file.file_type,
                        size: file.file_size,
                        url: file.public_url,
                        path: file.file_path
                    });
                });
                setReportAttachments(mappedFiles);
            }

            // 3. Fetch Cover Letter Data
            const coverLetterItem = textData?.find(item => item.section_key === 'cover_letter');
            if (coverLetterItem && coverLetterItem.content) {
                try {
                    const parsedContent = typeof coverLetterItem.content === 'string'
                        ? JSON.parse(coverLetterItem.content)
                        : coverLetterItem.content;
                    setCoverLetterData(parsedContent);
                } catch (parseError) {
                    console.error('Error parsing cover letter data:', parseError);
                }
            }

            // 4. Fetch Cover Page Data
            const coverPageItem = textData?.find(item => item.section_key === 'cover_page');
            if (coverPageItem && coverPageItem.content) {
                try {
                    const parsedContent = typeof coverPageItem.content === 'string'
                        ? JSON.parse(coverPageItem.content)
                        : coverPageItem.content;
                    setCoverPageData(parsedContent);
                } catch (parseError) {
                    console.error('Error parsing cover page data:', parseError);
                }
            }

            // 5. Fetch Foreword Data
            const forewordItem = textData?.find(item => item.section_key === 'foreword');
            if (forewordItem && forewordItem.content) {
                try {
                    const parsedContent = typeof forewordItem.content === 'string'
                        ? JSON.parse(forewordItem.content)
                        : forewordItem.content;
                    setForewordData(parsedContent);
                } catch (parseError) {
                    console.error('Error parsing foreword data:', parseError);
                }
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
            showNotification('Gagal memuat data laporan: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Text Update with Debounce to prevent spam saves
    const updateSection = useCallback(async (sectionId, content) => {
        // Optimistic Update - update UI immediately
        setReportData(prev => ({
            ...prev,
            [sectionId]: content
        }));

        // Clear existing timeout for this section if any
        if (saveTimeoutRef.current[sectionId]) {
            clearTimeout(saveTimeoutRef.current[sectionId]);
        }

        // Set new timeout - debounce 1 second
        saveTimeoutRef.current[sectionId] = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('monthly_reports')
                    .upsert(
                        { section_key: sectionId, content: content },
                        { onConflict: 'section_key' }
                    );

                if (error) {
                    console.error('Error saving text:', error);
                    showNotification('Gagal menyimpan: ' + error.message, 'error');
                    return { error };
                }

                // Silent save - no notification for auto-saves
                console.log('Auto-saved:', sectionId);
                return { success: true };
            } catch (err) {
                console.error('Save exception:', err);
                showNotification('Gagal menyimpan: ' + err.message, 'error');
                return { error: err };
            }
        }, 1000); // 1 second debounce

        // Return immediately for optimistic update
        return { success: true };
    }, [showNotification]);

    // Attachment Management
    const addAttachment = async (sectionId, file) => {
        try {
            // 1. Upload to Storage
            const filePath = `${sectionId}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('report-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: publicData } = supabase.storage
                .from('report-files')
                .getPublicUrl(filePath);

            const publicUrl = publicData.publicUrl;

            // 3. Insert into Database
            const { data: insertData, error: insertError } = await supabase
                .from('report_attachments')
                .insert([{
                    section_key: sectionId,
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

            setReportAttachments(prev => {
                const currentFiles = prev[sectionId] || [];
                return {
                    ...prev,
                    [sectionId]: [...currentFiles, newAttachment]
                };
            });

            showNotification('File berhasil diupload', 'success');

        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('Gagal mengupload file: ' + error.message, 'error');
            // alert('Gagal mengupload file: ' + error.message);
        }
    };

    const removeAttachment = async (sectionId, fileId) => {
        try {
            // Find file to get path
            const fileToRemove = reportAttachments[sectionId]?.find(f => f.id === fileId);
            if (!fileToRemove) return;

            // 1. Remove from Storage
            const { error: storageError } = await supabase.storage
                .from('report-files')
                .remove([fileToRemove.path]);

            if (storageError) console.warn('Storage delete warning:', storageError);

            // 2. Remove from DB
            const { error: dbError } = await supabase
                .from('report_attachments')
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            // 3. Update Local State
            setReportAttachments(prev => {
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

    const getAttachments = (sectionId) => {
        return reportAttachments[sectionId] || [];
    };

    const clearSection = async (sectionId) => {
        setReportData(prev => ({
            ...prev,
            [sectionId]: ''
        }));

        try {
            const { error } = await supabase
                .from('monthly_reports')
                .update({ content: '' })
                .eq('section_key', sectionId);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Clear section error:', err);
            showNotification('Gagal menghapus konten: ' + err.message, 'error');
            return { error: err };
        }
    };

    // Cover Letter Management
    const updateCoverLetter = async (data) => {
        // Optimistic Update
        setCoverLetterData(data);

        try {
            const jsonContent = JSON.stringify(data);
            const { error } = await supabase
                .from('monthly_reports')
                .upsert({
                    section_key: 'cover_letter',
                    content: jsonContent
                }, { onConflict: 'section_key' });

            if (error) {
                console.error('Error saving cover letter:', error);
                showNotification('Gagal menyimpan surat pengantar: ' + error.message, 'error');
                return { error };
            }
            return { success: true };
        } catch (err) {
            console.error('Save cover letter exception:', err);
            showNotification('Gagal menyimpan surat pengantar: ' + err.message, 'error');
            return { error: err };
        }
    };

    // Cover Page Management
    const updateCoverPage = async (data) => {
        // Optimistic Update
        setCoverPageData(data);

        try {
            const jsonContent = JSON.stringify(data);
            const { error } = await supabase
                .from('monthly_reports')
                .upsert({
                    section_key: 'cover_page',
                    content: jsonContent
                }, { onConflict: 'section_key' });

            if (error) {
                console.error('Error saving cover page:', error);
                showNotification('Gagal menyimpan halaman judul: ' + error.message, 'error');
                return { error };
            }
            return { success: true };
        } catch (err) {
            console.error('Save cover page exception:', err);
            showNotification('Gagal menyimpan halaman judul: ' + err.message, 'error');
            return { error: err };
        }
    };

    // Foreword Management
    const updateForeword = async (data) => {
        // Optimistic Update
        setForewordData(data);

        try {
            const jsonContent = JSON.stringify(data);
            const { error } = await supabase
                .from('monthly_reports')
                .upsert({
                    section_key: 'foreword',
                    content: jsonContent
                }, { onConflict: 'section_key' });

            if (error) {
                console.error('Error saving foreword:', error);
                showNotification('Gagal menyimpan kata pengantar: ' + error.message, 'error');
                return { error };
            }
            return { success: true };
        } catch (err) {
            console.error('Save foreword exception:', err);
            showNotification('Gagal menyimpan kata pengantar: ' + err.message, 'error');
            return { error: err };
        }
    };

    // Helper to get Label from ID (for display purposes)
    const getSectionLabel = (id) => {
        return id.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <ReportContext.Provider value={{
            reportData,
            updateSection,
            clearSection,
            reportAttachments,
            addAttachment,
            removeAttachment,
            getAttachments,
            getSectionLabel,
            coverLetterData,
            updateCoverLetter,
            coverPageData,
            updateCoverPage,
            forewordData,
            updateForeword,
            loading
        }}>
            {children}
        </ReportContext.Provider>
    );
};
