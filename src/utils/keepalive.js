// Utility untuk menjaga Supabase project tetap aktif
// Fungsi ini akan melakukan query sederhana ke database untuk mencegah auto-pause

import { supabase } from '../lib/supabaseClient'

/**
 * Fungsi heartbeat untuk menjaga koneksi database tetap aktif
 * @returns {Promise<{success: boolean, message: string, timestamp: string}>}
 */
export async function keepaliveHeartbeat() {
    try {
        const timestamp = new Date().toISOString()

        // Melakukan query sederhana untuk menjaga database aktif
        // Menggunakan query ke system table yang selalu ada
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1)
            .single()

        if (error) {
            // Jika table users tidak ada, coba query alternatif
            console.warn('Primary keepalive query failed, trying alternative...')

            // Coba query ke table lain yang mungkin ada
            const tables = ['report_types', 'monthly_reports', 'sections']
            let success = false

            for (const table of tables) {
                try {
                    const { error: altError } = await supabase
                        .from(table)
                        .select('count')
                        .limit(1)

                    if (!altError) {
                        success = true
                        console.log(`Keepalive successful using table: ${table}`)
                        break
                    }
                } catch (e) {
                    continue
                }
            }

            if (!success) {
                throw new Error('All keepalive queries failed')
            }
        }

        console.log('✅ Supabase keepalive successful at', timestamp)

        return {
            success: true,
            message: 'Keepalive heartbeat successful',
            timestamp
        }
    } catch (error) {
        console.error('❌ Supabase keepalive failed:', error.message)

        return {
            success: false,
            message: `Keepalive failed: ${error.message}`,
            timestamp: new Date().toISOString()
        }
    }
}

/**
 * Fungsi untuk menjalankan keepalive dengan retry logic
 * @param {number} maxRetries - Maksimal percobaan retry
 * @returns {Promise<{success: boolean, message: string, attempts: number}>}
 */
export async function keepaliveWithRetry(maxRetries = 3) {
    let attempts = 0

    while (attempts < maxRetries) {
        attempts++
        const result = await keepaliveHeartbeat()

        if (result.success) {
            return {
                ...result,
                attempts
            }
        }

        // Jika gagal dan masih ada retry tersisa, tunggu sebentar
        if (attempts < maxRetries) {
            const delay = attempts * 1000 // Exponential backoff
            console.log(`Retrying in ${delay}ms... (Attempt ${attempts}/${maxRetries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    return {
        success: false,
        message: `All ${maxRetries} keepalive attempts failed`,
        attempts
    }
}
