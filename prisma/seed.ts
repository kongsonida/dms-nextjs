import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dms.local' },
    update: {},
    create: {
      email: 'admin@dms.local',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create default folders
  const folders = [
    { name: 'Contracts', slug: 'contracts', description: 'Legal contracts and agreements' },
    { name: 'Invoices', slug: 'invoices', description: 'Financial invoices' },
    { name: 'Reports', slug: 'reports', description: 'Business reports and analytics' },
    { name: 'Policies', slug: 'policies', description: 'Company policies and procedures' },
  ];

  for (const folder of folders) {
    await prisma.folder.upsert({
      where: { slug: folder.slug },
      update: {},
      create: folder,
    });
  }

  console.log('✅ Created default folders');

  // Create default tags
  const tags = [
    { name: 'Important', slug: 'important', color: '#ef4444' },
    { name: 'Urgent', slug: 'urgent', color: '#f97316' },
    { name: 'Review', slug: 'review', color: '#eab308' },
    { name: 'Approved', slug: 'approved', color: '#22c55e' },
    { name: 'Archived', slug: 'archived', color: '#6b7280' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        ...tag,
        createdById: admin.id,
      },
    });
  }

  console.log('✅ Created default tags');

  // Create default retention policies
  const policies = [
    { name: '30 Days', daysToRetain: 30, action: 'delete', description: 'Delete after 30 days' },
    { name: '90 Days', daysToRetain: 90, action: 'archive', description: 'Archive after 90 days' },
    { name: '1 Year', daysToRetain: 365, action: 'archive', description: 'Archive after 1 year' },
    { name: '7 Years', daysToRetain: 2555, action: 'archive', description: 'Legal retention - 7 years' },
  ];

  for (const policy of policies) {
    await prisma.retentionPolicy.upsert({
      where: { name: policy.name },
      update: {},
      create: policy,
    });
  }

  console.log('✅ Created retention policies');

  // Create system settings
  const settings = [
    { key: 'max_file_size', value: '104857600', type: 'number', category: 'storage', label: 'Max File Size (bytes)' },
    { key: 'allowed_file_types', value: 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif', type: 'string', category: 'storage', label: 'Allowed File Types' },
    { key: 'enable_ocr', value: 'true', type: 'boolean', category: 'features', label: 'Enable OCR' },
    { key: 'enable_virus_scan', value: 'true', type: 'boolean', category: 'features', label: 'Enable Virus Scanning' },
    { key: 'trash_retention_days', value: '30', type: 'number', category: 'retention', label: 'Trash Retention (days)' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Created system settings');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📧 Admin credentials:');
  console.log('   Email: admin@dms.local');
  console.log('   Password: admin123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
