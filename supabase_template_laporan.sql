-- ============================================================
-- HORAS-IM: Tabel Template Laporan Paspor
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS laporan_template (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    seksi_id    integer NOT NULL,
    bulan       integer NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun       integer NOT NULL CHECK (tahun BETWEEN 2020 AND 2100),
    template_data jsonb NOT NULL DEFAULT '{}',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(seksi_id, bulan, tahun)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_laporan_template_seksi_bulan_tahun
    ON laporan_template(seksi_id, bulan, tahun);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_laporan_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_laporan_template_updated ON laporan_template;
CREATE TRIGGER trg_laporan_template_updated
    BEFORE UPDATE ON laporan_template
    FOR EACH ROW EXECUTE FUNCTION update_laporan_template_timestamp();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE laporan_template ENABLE ROW LEVEL SECURITY;

-- Super admin: akses penuh
CREATE POLICY "super_admin_all" ON laporan_template
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Admin seksi: hanya seksinya sendiri
CREATE POLICY "admin_seksi_own" ON laporan_template
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin_seksi'
            AND profiles.seksi_id = laporan_template.seksi_id
        )
    );

-- ── Sample data (opsional — hapus jika tidak diperlukan) ─────
-- INSERT INTO laporan_template (seksi_id, bulan, tahun, template_data)
-- VALUES (1, 3, 2026, '{}')
-- ON CONFLICT (seksi_id, bulan, tahun) DO NOTHING;
