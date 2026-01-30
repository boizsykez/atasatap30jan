// ============================================
// CLOUDFLARE WORKER - SAWERIA WEBHOOK PROXY
// 100% GRATIS | ALWAYS ONLINE 24/7
// NO SLEEP | GLOBAL CDN
// ============================================

// ⚠️ GANTI INI DENGAN USERNAME SAWERIA KAMU!
const SAWERIA_STREAM_ID = "atasatap";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS Headers (Allow all origins for Roblox)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    };

    // Handle CORS Preflight Request
    if (request.method === "OPTIONS") {
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(JSON.stringify({
        success: false,
        error: "Method not allowed. Use GET request."
      }), { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      // Parse query parameter: after_id (untuk anti-double)
      const afterId = url.searchParams.get("after_id");

      // Fetch dari Saweria Overlay API
      const saweriaUrl = `https://api.saweria.co/donations?stream_id=${SAWERIA_STREAM_ID}`;
      
      const response = await fetch(saweriaUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": "https://saweria.co"
        },
        cf: {
          cacheTtl: 0, // No caching for real-time data
          cacheEverything: false
        }
      });

      // Check response status
      if (!response.ok) {
        return new Response(JSON.stringify({
          success: false,
          error: `Saweria API returned ${response.status}`,
          details: "Check if SAWERIA_STREAM_ID is correct"
        }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      const data = await response.json();

      // Format response dengan ID tracking
      let donations = [];
      let latestId = null;

      if (data.data && Array.isArray(data.data)) {
        // Filter hanya donasi BARU (setelah afterId jika ada)
        donations = data.data
          .filter(d => {
            // Jika afterId ada, hanya ambil donasi yang ID-nya berbeda
            if (afterId) {
              return d.id !== afterId;
            }
            return true;
          })
          .map(d => ({
            id: d.id,
            donator_name: d.donator_name || "Anonymous",
            amount_raw: parseInt(d.amount_raw) || 0,
            message: (d.message || "").substring(0, 200), // Limit message length
            created_at: d.created_at || new Date().toISOString()
          }));

        // ID terbaru untuk tracking (ambil yang paling atas)
        if (data.data.length > 0) {
          latestId = data.data[0].id;
        }
      }

      // Response sukses
      return new Response(JSON.stringify({
        success: true,
        donations: donations,
        latest_id: latestId,
        count: donations.length,
        timestamp: new Date().toISOString(),
        stream_id: SAWERIA_STREAM_ID
      }), { 
        status: 200,
        headers: corsHeaders 
      });

    } catch (error) {
      // Catch any errors
      return new Response(JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
        details: "Check Cloudflare Worker logs for more info"
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};

// ============================================
// CARA DEPLOY:
// ============================================
// 1. Login ke dashboard.cloudflare.com
// 2. Workers & Pages → Create Application
// 3. Create Worker → Beri nama (e.g., saweria-webhook)
// 4. Deploy → Edit Code
// 5. Copy paste code ini
// 6. GANTI "atasatap" di line 8 dengan username Saweria kamu
// 7. Save and Deploy
// 8. Copy URL worker (e.g., https://saweria-webhook.yourname.workers.dev)
// 9. Paste URL tersebut di script Roblox Saweria.lua (line ENDPOINT)
//
// SELESAI! Worker akan jalan 24/7 gratis!
// ============================================
