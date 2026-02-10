#!/usr/bin/env node

/**
 * Standalone script untuk menjalankan Supabase keepalive
 * Script ini bisa dijalankan secara manual atau dijadwalkan menggunakan:
 * - Windows Task Scheduler
 * - cron-job.org
 * - EasyCron
 * - atau service cron lainnya
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY harus diset di .env file')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function keepalive() {
    try {
        const timestamp = new Date().toISOString()
        console.log(`\n🔄 Running Supabase keepalive at ${timestamp}`)
        console.log(`📍 Supabase URL: ${supabaseUrl}`)

        // Coba query ke beberapa table
        const tables = ['users', 'report_types', 'monthly_reports', 'sections']
        let success = false

        for (const table of tables) {
            try {
                console.log(`   Trying table: ${table}...`)

                const { error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1)

                if (!error) {
                    success = true
                    console.log(`   ✅ Success using table: ${table}`)
                    break
                } else {
                    console.log(`   ⚠️  Table ${table} unavailable: ${error.message}`)
                }
            } catch (e) {
                console.log(`   ⚠️  Error with table ${table}: ${e.message}`)
                continue
            }
        }

        if (success) {
            console.log(`\n✅ Supabase keepalive berhasil!`)
            console.log(`   Database tetap aktif dan project tidak akan di-pause.`)
            return true
        } else {
            throw new Error('Semua percobaan query gagal')
        }
    } catch (error) {
        console.error(`\n❌ Supabase keepalive gagal: ${error.message}`)
        console.error(`   Silakan cek koneksi database Anda.`)
        return false
    }
}

// Jalankan keepalive
keepalive()
    .then(success => {
        process.exit(success ? 0 : 1)
    })
    .catch(error => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
