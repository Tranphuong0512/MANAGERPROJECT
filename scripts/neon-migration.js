require('dotenv').config();
const { Client } = require('pg');

// ==========================================
// CẤU HÌNH (CONFIGURATION)
// ==========================================
// 1. Nhập Connection String của NEON vào đây (hoặc file .env với biến NEON_DATABASE_URL)
const NEON_DB_URL = process.env.NEON_DATABASE_URL || 'postgres://user:password@ep-cold-moon-123456.us-east-2.aws.neon.tech/neondb';

// 2. Tự động lấy cấu hình của Supabase hiện tại
const SUPABASE_DB_URL = 'postgresql://postgres.escbcctpfuwtvaykwsux:Nixtech.AI%40%232026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

// 3. Mapping Cấu trúc (Phòng khi bảng bên Neon tên khác)
// Sửa giá trị bên phải bằng đúng Tên Bảng (Table Name) bên Neon của bạn
const TABLE_MAPPING = {
  profiles: 'profiles',
  organizations: 'organizations',
  projects: 'projects',
  tasks: 'tasks',
  incidents: 'incidents',
  improvements: 'improvements',
};

async function migrateData() {
  console.log('🚀 Bắt đầu tiến trình Migrate dữ liệu từ Neon về Supabase...');

  const neonClient = new Client({ connectionString: NEON_DB_URL, ssl: { rejectUnauthorized: false } });
  const supaClient = new Client({ connectionString: SUPABASE_DB_URL });

  try {
    console.log('🔄 Đang kết nối tới Neon Database...');
    await neonClient.connect();
    console.log('✅ Kết nối Neon thành công!');

    console.log('🔄 Đang kết nối tới Supabase Database...');
    await supaClient.connect();
    console.log('✅ Kết nối Supabase thành công!');

    const tablesToMigrate = [
      { name: TABLE_MAPPING.profiles, target: 'profiles' },
      { name: TABLE_MAPPING.organizations, target: 'organizations' },
      { name: TABLE_MAPPING.projects, target: 'projects' },
      { name: TABLE_MAPPING.tasks, target: 'tasks' },
      { name: TABLE_MAPPING.incidents, target: 'incidents' },
      { name: TABLE_MAPPING.improvements, target: 'improvements' }
    ];

    for (const table of tablesToMigrate) {
      console.log(`\n📦 Đang xử lý bảng: ${table.name} -> ${table.target}...`);
      
      try {
        // 1. Lấy dữ liệu từ Neon
        const { rows } = await neonClient.query(`SELECT * FROM ${table.name}`);
        console.log(`   Tìm thấy ${rows.length} bản ghi bên Neon.`);

        if (rows.length === 0) continue;

        // 2. Chèn dữ liệu sang Supabase
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
            const values = Object.values(row);
            const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

            // Dùng ON CONFLICT DO NOTHING để bỏ qua bản ghi đã tồn tại (dựa trên id)
            const query = `
              INSERT INTO public.${table.target} (${columns}) 
              VALUES (${placeholders}) 
              ON CONFLICT (id) DO NOTHING
            `;
            
            await supaClient.query(query, values);
            successCount++;
          } catch (insertError) {
            console.error(`   ❌ Lỗi chèn bản ghi ID: ${row.id}:`, insertError.message);
            errorCount++;
          }
        }
        
        console.log(`   ✅ Hoàn tất: Chèn thành công ${successCount}, Lỗi ${errorCount}`);
      } catch (tableError) {
        console.error(`   ❌ Bảng ${table.name} không tồn tại bên Neon hoặc lỗi truy vấn:`, tableError.message);
      }
    }

    console.log('\n🎉 Quá trình Migrate hoàn tất!');
  } catch (err) {
    console.error('❌ Lỗi hệ thống Migration:', err);
  } finally {
    await neonClient.end();
    await supaClient.end();
  }
}

migrateData();
